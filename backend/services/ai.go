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

	"gorm.io/gorm"
	"nebula-backend/models"
)

type LLMNodeResponse struct {
	ID          uint   `json:"id"`
	ParentID    *uint  `json:"parent_id"` // null for root
	Title       string `json:"title"`
	Description string `json:"description"`
}

var promptTemplate = `
You are an elite System Architect and RPG Game Designer. The user (an INTP Backend Developer) is building a "System" to gamify their life and learning.
They want to learn a new skill/topic and need a "Constellation" (a passive skill tree, like in Path of Exile).

Your task: Break down the provided Topic into a logical, progressive skill tree.
Rules:
1. The tree MUST have exactly 1 root node (level 1 knowledge).
2. The tree must branch out logically into specialized sub-skills (total 10-15 nodes).
3. Progression must make sense (e.g., you cannot unlock "Concurrency" before "Syntax").
4. Tone: Technical, concise, gamified ("Unlock this node to master X").
5. Return ONLY a valid JSON array of objects. NO markdown blocks or code fences, NO extra text.

JSON Schema for EACH object in the array:
{
  "id": integer (Sequential, start at 1),
  "parent_id": integer or null (Use null ONLY for the 1 root node. All other nodes must have a valid parent_id referencing an earlier id),
  "title": string (Short, punchy skill name, max 3-4 words),
  "description": string (1-2 sentences explaining what unlocking this node grants the user)
}

Topic: %s
`

// GenerateConstellation triggers the LLM pipeline, formats the response into nodes, and safely commits to DB
func GenerateConstellation(db *gorm.DB, userID uint, topic string) (*models.Constellation, []models.StarNode, error) {
	// 1. Call LLM to get unstructured-but-structured JSON array of nodes
	nodes, err := callGeminiLLM(topic)
	if err != nil {
		return nil, nil, fmt.Errorf("AI Generation failed: %w", err)
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
			node := models.StarNode{
				ConstellationID: constellation.ID,
				Title:           llmNode.Title,
				Description:     llmNode.Description,
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

	var parseNodes []LLMNodeResponse
	if err := json.Unmarshal([]byte(jsonText), &parseNodes); err != nil {
		return nil, fmt.Errorf("failed to parse array from LLM structured JSON: %w", err)
	}

	return parseNodes, nil
}
