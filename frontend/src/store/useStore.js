import { create } from 'zustand';

const API = 'http://localhost:3000/api/v1';

const useStore = create((set, get) => ({
  user: null,
  dailyTasks: [],

  fetchProfile: async () => {
    try {
      const res = await fetch(`${API}/profile`);
      const data = await res.json();
      set({ user: data });
    } catch (e) {
      console.error('Failed to fetch profile', e);
    }
  },

  fetchDailyTasks: async () => {
    try {
      const res = await fetch(`${API}/profile`);
      const data = await res.json();
      set({ user: data });
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    }
  },

  updatePhysics: async (height, weight) => {
    try {
      const res = await fetch(`${API}/profile/physics`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ height: parseFloat(height), weight: parseFloat(weight) }),
      });
      const data = await res.json();
      if (res.ok) set({ user: data });
      return { ok: res.ok, data };
    } catch (e) {
      console.error('Failed to update physics', e);
      return { ok: false };
    }
  },

  completeDaily: async (taskId) => {
    try {
      const res = await fetch(`${API}/dailies/${taskId}/complete`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        set({ user: data.user });
        const tasks = get().dailyTasks.map((t) =>
          t.ID === taskId ? { ...t, IsCompleted: true } : t
        );
        set({ dailyTasks: tasks });
      }
      return { ok: res.ok, data };
    } catch (e) {
      console.error('Failed to complete daily', e);
      return { ok: false };
    }
  },

  setDailyTasks: (tasks) => set({ dailyTasks: tasks }),
}));

export default useStore;
