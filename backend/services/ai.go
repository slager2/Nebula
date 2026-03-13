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

type LLMAIPayload struct {
	Overview      string   `json:"overview"`
	KeyConcepts   []string `json:"key_concepts"`
	PracticalTask string   `json:"practical_task"`
}

type LLMNodeResponse struct {
	ID          uint         `json:"id"`
	ParentID    *uint        `json:"parent_id"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	Codex       LLMAIPayload `json:"codex"`
}

var promptTemplate = `
You are an elite System Architect and RPG Game Designer. The user is building a "System" to gamify learning.
They want to learn a new skill/topic and need a "Constellation" (a passive skill tree, like in Path of Exile).

Your task: Break down the provided Topic into a logical, progressive skill tree.
Rules:
1. The tree MUST have exactly 1 root node (level 1 knowledge).
2. The tree must branch out logically into specialized sub-skills (total 10-15 nodes).
3. Progression must make sense (e.g., you cannot unlock "Concurrency" before "Syntax").
4. Each node MUST include a "codex" object with AI-generated study content.
5. Tone: Technical, concise, gamified.
6. Return ONLY a valid JSON array. NO markdown, NO code fences, NO extra text.

JSON Schema for EACH object in the array:
{
  "id": integer (Sequential, start at 1),
  "parent_id": integer or null (null ONLY for root node),
  "title": string (Short skill name, max 3-4 words),
  "description": string (1-2 sentences explaining what this node grants),
  "codex": {
    "overview": "TL;DR explanation of the concept (2-3 sentences max)",
    "key_concepts": ["Concept 1", "Concept 2", "Concept 3"],
    "practical_task": "One specific, actionable micro-task to test understanding"
  }
}

The "codex.overview" should be a clear, beginner-friendly explanation.
The "codex.key_concepts" should list 3-5 core ideas as short strings.
The "codex.practical_task" should be one concrete mini-challenge.

Topic: %s
`

// sanitizeJSON strips markdown code fences and whitespace from LLM output.
func sanitizeJSON(raw string) string {
	s := strings.TrimSpace(raw)
	// Strip ```json or ``` prefix
	if strings.HasPrefix(s, "```json") {
		s = strings.TrimPrefix(s, "```json")
	} else if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```")
	}
	// Strip ``` suffix
	if strings.HasSuffix(s, "```") {
		s = strings.TrimSuffix(s, "```")
	}
	return strings.TrimSpace(s)
}

// GenerateConstellation triggers the LLM pipeline, formats the response into nodes, and safely commits to DB
func GenerateConstellation(db *gorm.DB, userID uint, topic string) (*models.Constellation, []models.StarNode, error) {
	var nodes []LLMNodeResponse
	var err error

	// Retry logic (up to 3 attempts)
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

	// Wrap DB insertion in transaction
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

		idMap := make(map[uint]uint)

		for _, llmNode := range nodes {
			node := models.StarNode{
				ConstellationID: constellation.ID,
				Title:           llmNode.Title,
				Description:     llmNode.Description,
				Codex: models.AIPayload{
					Overview:      llmNode.Codex.Overview,
					KeyConcepts:   llmNode.Codex.KeyConcepts,
					PracticalTask: llmNode.Codex.PracticalTask,
				},
				IsUnlocked: false,
			}

			if llmNode.ParentID != nil {
				if actualParentID, exists := idMap[*llmNode.ParentID]; exists {
					node.ParentNodeID = &actualParentID
				} else {
					log.Println("Warning: parent ID not found in map", *llmNode.ParentID, "for node", llmNode.Title)
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

	// Robust sanitization — strip markdown fences
	jsonText = sanitizeJSON(jsonText)

	var parseNodes []LLMNodeResponse
	if err := json.Unmarshal([]byte(jsonText), &parseNodes); err != nil {
		log.Printf("[AI] Raw JSON text from LLM: %s", jsonText)
		return nil, fmt.Errorf("failed to parse array from LLM structured JSON: %w", err)
	}

	return parseNodes, nil
}
