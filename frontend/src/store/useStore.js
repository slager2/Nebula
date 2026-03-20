import { create } from 'zustand';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

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
        // Update the task in local state with streak from response
        const returnedTask = data.task;
        const tasks = get().dailyTasks.map((t) =>
          t.ID === taskId
            ? { ...t, IsCompleted: true, Streak: returnedTask?.Streak ?? t.Streak + 1 }
            : t
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

  verifyNode: async (nodeId, shard) => {
    try {
      const res = await fetch(`${API}/nodes/${nodeId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shard }),
      });
      const data = await res.json();
      if (res.ok) {
        set({ user: data.user });
        const gd = get().graphData;
        if (gd) {
          // Mutate in-place to preserve d3-force x/y/vx/vy positions
          let targetNode = null;
          gd.nodes.forEach((n) => {
            if (n.id === String(nodeId) || n.id === nodeId) {
              n.unlocked = true;
              n.knowledge_shard = shard;
              targetNode = n;
            }
          });
          set({ graphData: { nodes: [...gd.nodes], links: [...gd.links] } });

          if (targetNode) {
            set({ activeNode: { ...targetNode } });
          }
        }
      }
      return { ok: res.ok, data };
    } catch (e) {
      console.error('Failed to verify node', e);
      return { ok: false };
    }
   },

   reviewNode: async (nodeId, quality) => {
     try {
       const res = await fetch(`${API}/nodes/${nodeId}/review`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ quality }),
       });
       const data = await res.json();
       if (res.ok) {
         set({ user: data.user });
         // Update the specific node's review metadata in archiveData
         const archiveData = get().archiveData;
         const updatedArchive = archiveData.map(c => ({
           ...c,
           nodes: c.nodes.map(n =>
             n.ID === nodeId 
               ? { 
                   ...n, 
                   NextReviewAt: data.node.NextReviewAt, 
                   ReviewCount: data.node.ReviewCount 
                 } 
               : n
           ),
         }));
         set({ archiveData: updatedArchive });
       }
       return { ok: res.ok, data };
     } catch (e) {
       console.error('Failed to review node', e);
       return { ok: false };
     }
   },

   deleteConstellation: async (constellationId) => {
     try {
       const res = await fetch(`${API}/constellations/${constellationId}`, {
         method: 'DELETE',
         headers: { 'Content-Type': 'application/json' },
       });
       const data = await res.json();
       if (res.ok) {
         // Refetch archive to update UI
         const archiveRes = await fetch(`${API}/archive`);
         const archiveData = await archiveRes.json();
         if (Array.isArray(archiveData)) {
           set({ archiveData });
         }
       }
       return { ok: res.ok, data };
     } catch (e) {
       console.error('Failed to delete constellation', e);
       return { ok: false };
     }
   },

   archiveData: [],
  fetchArchive: async () => {
    try {
      const res = await fetch(`${API}/archive`);
      const data = await res.json();
      if (Array.isArray(data)) {
        set({ archiveData: data });
      }
    } catch (e) {
      console.error('Failed to fetch archive', e);
    }
  },
}));

export default useStore;
