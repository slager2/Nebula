package services

import (
	"testing"
	"time"
)

func TestCalculateReviewSchedule(t *testing.T) {
	now := time.Date(2026, time.August, 7, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name      string
		stage     int
		quality   string
		wantStage int
		wantDelay time.Duration
	}{
		{name: "again retries soon", stage: 2, quality: "again", wantStage: 1, wantDelay: 10 * time.Minute},
		{name: "hard holds stage", stage: 2, quality: "hard", wantStage: 2, wantDelay: 24 * time.Hour},
		{name: "good advances", stage: 0, quality: "good", wantStage: 1, wantDelay: 3 * 24 * time.Hour},
		{name: "easy advances two stages", stage: 0, quality: "easy", wantStage: 2, wantDelay: 7 * 24 * time.Hour},
		{name: "stage is capped", stage: 5, quality: "easy", wantStage: 5, wantDelay: 60 * 24 * time.Hour},
		{name: "legacy stage is clamped", stage: 30, quality: "hard", wantStage: 5, wantDelay: 24 * time.Hour},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stage, next, err := calculateReviewSchedule(tt.stage, tt.quality, now)
			if err != nil {
				t.Fatalf("calculateReviewSchedule() error = %v", err)
			}
			if stage != tt.wantStage {
				t.Fatalf("stage = %d, want %d", stage, tt.wantStage)
			}
			if delay := next.Sub(now); delay != tt.wantDelay {
				t.Fatalf("delay = %s, want %s", delay, tt.wantDelay)
			}
		})
	}
}

func TestCalculateReviewScheduleRejectsUnknownQuality(t *testing.T) {
	if _, _, err := calculateReviewSchedule(0, "perfect", time.Now()); err == nil {
		t.Fatal("calculateReviewSchedule() accepted an unknown quality")
	}
}
