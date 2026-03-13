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
      const res = await fetch(`${API}/dailies`);
      const data = await res.json();
      if (Array.isArray(data)) {
        set({ dailyTasks: data });
      }
    } catch (e) {
      console.error('Failed to fetch dailies', e);
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

  createDailyTask: async (taskData) => {
    try {
      const res = await fetch(`${API}/dailies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      const data = await res.json();
      if (res.ok) {
        set({ dailyTasks: [...get().dailyTasks, data] });
      }
      return { ok: res.ok, data };
    } catch (e) {
      console.error('Failed to create daily', e);
      return { ok: false };
    }
  },

  deleteDailyTask: async (id) => {
    try {
      const res = await fetch(`${API}/dailies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set({ dailyTasks: get().dailyTasks.filter((t) => t.ID !== id) });
      }
      return { ok: res.ok };
    } catch (e) {
      console.error('Failed to delete daily', e);
      return { ok: false };
    }
  },

  setDailyTasks: (tasks) => set({ dailyTasks: tasks }),

  graphData: null,
  setGraphData: (data) => set({ graphData: data }),

  activeNode: null,
  setActiveNode: (node) => set({ activeNode: node }),

  unlockNode: async (nodeId) => {
    try {
      const res = await fetch(`${API}/nodes/${nodeId}/unlock`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        set({ user: data.user });
        const gd = get().graphData;
        if (gd) {
          const updatedNodes = gd.nodes.map((n) =>
            n.id === String(nodeId) || n.id === nodeId ? { ...n, unlocked: true } : n
          );
          set({ graphData: { ...gd, nodes: updatedNodes } });
        }
      }
      return { ok: res.ok, data };
    } catch (e) {
      console.error('Failed to unlock node', e);
      return { ok: false };
    }
  },
}));

export default useStore;
