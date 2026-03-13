package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"gorm.io/gorm"
	"nebula-backend/models"
)

type LLMResource struct {
	Title string `json:"title"`
	Type  string `json:"type"`
	URL   string `json:"url"`
}

type LLMNodeResponse struct {
	ID          uint          `json:"id"`
	ParentID    *uint         `json:"parent_id"`
	Title       string        `json:"title"`
	Description string        `json:"description"`
	Resources   []LLMResource `json:"resources"`
}

var promptTemplate = `
You are an elite System Architect and RPG Game Designer. The user is building a "System" to gamify learning.
They want to learn a new skill/topic and need a "Constellation" (a passive skill tree, like in Path of Exile).

Your task: Break down the provided Topic into a logical, progressive skill tree.
Rules:
1. The tree MUST have exactly 1 root node (level 1 knowledge).
2. The tree must branch out logically into specialized sub-skills (total 10-15 nodes).
3. Progression must make sense (e.g., you cannot unlock "Concurrency" before "Syntax").
4. Each node MUST include a "resources" array with 2-4 study resources.
5. For the "url" field, generate a highly probable Google Search URL or YouTube Search URL for the topic (e.g., "https://www.youtube.com/results?search_query=golang+channels" or "https://www.google.com/search?q=rust+borrow+checker+tutorial").
6. Tone: Technical, concise, gamified.
7. Return ONLY a valid JSON array. NO markdown, NO code fences, NO extra text.

JSON Schema for EACH object in the array:
{
  "id": integer (Sequential, start at 1),
  "parent_id": integer or null (null ONLY for root node),
  "title": string (Short skill name, max 3-4 words),
  "description": string (1-2 sentences explaining what this node grants),
  "resources": [
    {"title": "Understanding X Basics", "type": "article", "url": "https://www.google.com/search?q=understanding+x+basics"},
    {"title": "X Crash Course", "type": "video", "url": "https://www.youtube.com/results?search_query=x+crash+course"},
    {"title": "Practice X Exercises", "type": "exercise", "url": "https://www.google.com/search?q=x+practice+exercises"}
  ]
}

Resource types MUST be one of: "article", "video", "exercise".
Every resource MUST have a valid "url" field.

Topic: %s
`

// GenerateConstellation triggers the LLM pipeline, formats the response into nodes, and safely commits to DB
func GenerateConstellation(db *gorm.DB, userID uint, topic string) (*models.Constellation, []models.StarNode, error) {
	var nodes []LLMNodeResponse
	var err error

	// Retry logic (up to 3 attempts) for Fallback & Validation
	for attempt := 1; attempt <= 3; attempt++ {
		nodes, err = callGeminiLLM(topic)
		if err == nil {
			break
		}
		log.Printf("[AI] Attempt %d failed: %v", attempt, err)
		if attempt < 3 {
			time.Sleep(2 * time.Second)
		}
	}

	if err != nil {
		return nil, nil, fmt.Errorf("AI Generation failed after 3 attempts: %w", err)
	}

	// 2. Wrap DB insertion in transaction
	var constellation models.Constellation
	var builtNodes []models.StarNode

	err = db.Transaction(func(tx *gorm.DB) error {
		constellation = models.Constellation{
			UserID:      userID,
			Topic:       topic,
			Description: fmt.Sprintf("A cosmic skill tree for %s", topic),
		}

		if err := tx.Create(&constellation).Error; err != nil {
			return err
		}

		// Map to keep track of LLM ID -> Gorm DB ID for Graph linking
		idMap := make(map[uint]uint)

		// For MVP, we insert nodes sequentially. Assumes the LLM returns parent nodes before children.
		for _, llmNode := range nodes {
			// Convert LLM resources to model resources
			var resources models.ResourceList
			for _, r := range llmNode.Resources {
				resources = append(resources, models.Resource{Title: r.Title, Type: r.Type, URL: r.URL})
			}

			node := models.StarNode{
				ConstellationID: constellation.ID,
				Title:           llmNode.Title,
				Description:     llmNode.Description,
				Resources:       resources,
				IsUnlocked:      false,
			}

			if llmNode.ParentID != nil {
				// Translate the LLM-generated sequential "ParentID" to the actual PostgreSQL generated Primary Key
				if actualParentID, exists := idMap[*llmNode.ParentID]; exists {
					node.ParentNodeID = &actualParentID
				} else {
					log.Println("Warning: parent ID not found in map", *llmNode.ParentID, "for node", llmNode.Title)
					// If the LLM places a child before parent, edge creation drops. 
					// A real fix would be 2-pass topological sort parsing, but sequential is fine for most LLM outputs.
				}
			}

			if err := tx.Create(&node).Error; err != nil {
				return err
			}

			idMap[llmNode.ID] = node.ID
			builtNodes = append(builtNodes, node)
		}

		return nil
	})

	return &constellation, builtNodes, err
}

func callGeminiLLM(topic string) ([]LLMNodeResponse, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return nil, errors.New("GEMINI_API_KEY is not set in .env")
	}

	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey
	prompt := fmt.Sprintf(promptTemplate, topic)

	bodyParams := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"responseMimeType": "application/json",
		},
	}

	jsonValue, _ := json.Marshal(bodyParams)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonValue))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("LLM API Error: %s", string(bodyBytes))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(bodyBytes, &geminiResp); err != nil {
		return nil, err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, errors.New("empty response from Gemini LLM")
	}

	jsonText := geminiResp.Candidates[0].Content.Parts[0].Text

	// JSON Sanitization: Strip markdown code fences if LLM wraps output
	jsonText = strings.TrimSpace(jsonText)
	if strings.HasPrefix(jsonText, "```json") {
		jsonText = strings.TrimPrefix(jsonText, "```json")
	} else if strings.HasPrefix(jsonText, "```") {
		jsonText = strings.TrimPrefix(jsonText, "```")
	}
	if strings.HasSuffix(jsonText, "```") {
		jsonText = strings.TrimSuffix(jsonText, "```")
	}
	jsonText = strings.TrimSpace(jsonText)

	var parseNodes []LLMNodeResponse
	if err := json.Unmarshal([]byte(jsonText), &parseNodes); err != nil {
		log.Printf("[AI] Raw JSON text from LLM: %s", jsonText)
		return nil, fmt.Errorf("failed to parse array from LLM structured JSON: %w", err)
	}

	return parseNodes, nil
}
