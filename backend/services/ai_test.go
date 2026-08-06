package services

import (
	"os"
	"strings"
	"testing"
)

func validLLMNodes() []LLMNodeResponse {
	nodes := make([]LLMNodeResponse, 10)
	for i := range nodes {
		id := uint(i + 1)
		nodes[i] = LLMNodeResponse{
			ID:          id,
			Title:       "Node",
			Description: "Node description",
			Codex: LLMAIPayload{
				Overview:           "Overview",
				KeyConcepts:        []string{"One", "Two", "Three"},
				PracticalTask:      "Complete a task",
				LearningObjective:  "Explain the concept",
				CompletionCriteria: "Complete and explain the task",
				RecallPrompt:       "What is the concept?",
			},
		}
		if i > 0 {
			parentID := uint(i)
			nodes[i].ParentID = &parentID
		}
	}
	return nodes
}

func TestSanitizeJSON(t *testing.T) {
	raw := "```json\n{\"nodes\": []}\n```"
	if got, want := sanitizeJSON(raw), `{"nodes": []}`; got != want {
		t.Fatalf("sanitizeJSON() = %q, want %q", got, want)
	}
}

func TestValidateLLMNodes(t *testing.T) {
	if err := validateLLMNodes(validLLMNodes()); err != nil {
		t.Fatalf("valid tree rejected: %v", err)
	}

	tests := []struct {
		name    string
		mutate  func([]LLMNodeResponse)
		wantErr string
	}{
		{
			name: "duplicate ID",
			mutate: func(nodes []LLMNodeResponse) {
				nodes[9].ID = nodes[8].ID
			},
			wantErr: "duplicate node ID",
		},
		{
			name: "missing parent",
			mutate: func(nodes []LLMNodeResponse) {
				parentID := uint(99)
				nodes[9].ParentID = &parentID
			},
			wantErr: "references missing parent",
		},
		{
			name: "multiple roots",
			mutate: func(nodes []LLMNodeResponse) {
				nodes[1].ParentID = nil
			},
			wantErr: "exactly one root",
		},
		{
			name: "cycle",
			mutate: func(nodes []LLMNodeResponse) {
				parentNine := uint(9)
				parentTen := uint(10)
				nodes[8].ParentID = &parentTen
				nodes[9].ParentID = &parentNine
			},
			wantErr: "cycle detected",
		},
		{
			name: "empty codex",
			mutate: func(nodes []LLMNodeResponse) {
				nodes[4].Codex.Overview = " "
			},
			wantErr: "incomplete codex",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			nodes := validLLMNodes()
			tt.mutate(nodes)
			err := validateLLMNodes(nodes)
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("validateLLMNodes() error = %v, want containing %q", err, tt.wantErr)
			}
		})
	}
}

func TestGroqIntegration(t *testing.T) {
	if os.Getenv("RUN_GROQ_INTEGRATION") != "1" {
		t.Skip("set RUN_GROQ_INTEGRATION=1 to call the live Groq API")
	}

	nodes, err := callGroqLLM("Go error handling")
	if err != nil {
		t.Fatalf("Groq request failed: %v", err)
	}
	if err := validateLLMNodes(nodes); err != nil {
		t.Fatalf("Groq returned an invalid tree: %v", err)
	}
}
