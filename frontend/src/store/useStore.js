import { create } from 'zustand';
import { apiRequest } from '../api';

const errorMessage = (error) => error?.message || 'Something went wrong. Please try again.';
let learningRequestID = 0;
let plansRequestID = 0;
let archiveRequestID = 0;

const useStore = create((set, get) => ({
  user: null,
  profileStatus: 'idle',
  profileError: null,
  dailyTasks: [],
  dailyStatus: 'idle',
  dailyError: null,
  archiveData: [],
  archiveStatus: 'idle',
  archiveError: null,
  plans: [],
  plansStatus: 'idle',
  learningToday: null,
  learningStatus: 'idle',
  learningError: null,
  graphData: null,
  activeNode: null,

  fetchProfile: async () => {
    set({ profileStatus: 'loading', profileError: null });
    try {
      const user = await apiRequest('/profile');
      set({ user, profileStatus: 'success' });
      return { ok: true, data: user };
    } catch (error) {
      set({ profileStatus: 'error', profileError: errorMessage(error) });
      return { ok: false, error: errorMessage(error) };
    }
  },

  fetchLearningToday: async () => {
	const requestID = ++learningRequestID;
    set({ learningStatus: 'loading', learningError: null });
    try {
      const learningToday = await apiRequest('/learning/today');
	  if (requestID !== learningRequestID) return { ok: false, stale: true };
      set({
        learningToday,
        learningStatus: 'success',
        plans: learningToday.plans || [],
        plansStatus: 'success',
        dailyTasks: learningToday.habits || [],
        dailyStatus: 'success',
      });
      return { ok: true, data: learningToday };
    } catch (error) {
	  if (requestID !== learningRequestID) return { ok: false, stale: true };
      set({ learningStatus: 'error', learningError: errorMessage(error) });
      return { ok: false, error: errorMessage(error) };
    }
  },

  fetchPlans: async () => {
	const requestID = ++plansRequestID;
    set({ plansStatus: 'loading' });
    try {
      const plans = await apiRequest('/constellations');
	  if (requestID !== plansRequestID) return { ok: false, stale: true };
      set({ plans: Array.isArray(plans) ? plans : [], plansStatus: 'success' });
      return { ok: true, data: plans };
    } catch (error) {
	  if (requestID !== plansRequestID) return { ok: false, stale: true };
      set({ plansStatus: 'error' });
      return { ok: false, error: errorMessage(error) };
    }
  },

  fetchDailyTasks: async () => {
    set({ dailyStatus: 'loading', dailyError: null });
    try {
      const dailyTasks = await apiRequest('/dailies');
      set({ dailyTasks: Array.isArray(dailyTasks) ? dailyTasks : [], dailyStatus: 'success' });
      return { ok: true, data: dailyTasks };
    } catch (error) {
      set({ dailyStatus: 'error', dailyError: errorMessage(error) });
      return { ok: false, error: errorMessage(error) };
    }
  },

  fetchArchive: async () => {
	const requestID = ++archiveRequestID;
    set({ archiveStatus: 'loading', archiveError: null });
    try {
      const archiveData = await apiRequest('/archive');
	  if (requestID !== archiveRequestID) return { ok: false, stale: true };
      set({ archiveData: Array.isArray(archiveData) ? archiveData : [], archiveStatus: 'success' });
      return { ok: true, data: archiveData };
    } catch (error) {
	  if (requestID !== archiveRequestID) return { ok: false, stale: true };
      set({ archiveStatus: 'error', archiveError: errorMessage(error) });
      return { ok: false, error: errorMessage(error) };
    }
  },

  updatePhysics: async (height, weight) => {
    try {
      const user = await apiRequest('/profile/physics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ height: Number(height), weight: Number(weight) }),
      });
      set({ user });
      return { ok: true, data: user };
    } catch (error) {
      return { ok: false, error: errorMessage(error), data: error.data };
    }
  },

  completeDaily: async (taskId) => {
    try {
      const data = await apiRequest(`/dailies/${taskId}/complete`, { method: 'POST' });
      set({
        user: data.user,
        dailyTasks: get().dailyTasks.map((task) => task.ID === taskId ? data.task : task),
      });
      get().fetchLearningToday();
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: errorMessage(error), data: error.data };
    }
  },

  createDailyTask: async (taskData) => {
    try {
      const task = await apiRequest('/dailies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      set({ dailyTasks: [...get().dailyTasks, task] });
      get().fetchLearningToday();
      return { ok: true, data: task };
    } catch (error) {
      return { ok: false, error: errorMessage(error), data: error.data };
    }
  },

  deleteDailyTask: async (id) => {
    try {
      await apiRequest(`/dailies/${id}`, { method: 'DELETE' });
      set({ dailyTasks: get().dailyTasks.filter((task) => task.ID !== id) });
      get().fetchLearningToday();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error), data: error.data };
    }
  },

  setGraphData: (graphData) => set({ graphData }),
  setActiveNode: (activeNode) => set({ activeNode }),

  completeNode: async (nodeId, reflection) => {
    try {
      const data = await apiRequest(`/nodes/${nodeId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shard: reflection }),
      });
      const graphData = get().graphData;
      let activeNode = null;
      if (graphData) {
        const nodes = graphData.nodes.map((node) => {
          if (String(node.id) === String(nodeId)) {
            activeNode = {
              ...node,
              unlocked: true,
              available: false,
              status: 'completed',
              knowledge_shard: reflection,
              learned_at: data.node.LearnedAt,
              next_review_at: data.node.NextReviewAt,
            };
            return activeNode;
          }
          if (String(node.parent_id) === String(nodeId) && node.status === 'blocked') {
            return { ...node, available: true, status: 'available' };
          }
          return node;
        });
        set({ graphData: { nodes, links: [...graphData.links] }, activeNode });
      }
      set({ user: data.user });
      get().fetchLearningToday();
      get().fetchPlans();
      get().fetchArchive();
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: errorMessage(error), data: error.data };
    }
  },

  verifyNode: async (nodeId, reflection) => get().completeNode(nodeId, reflection),

  reviewNode: async (nodeId, quality) => {
    try {
      const data = await apiRequest(`/nodes/${nodeId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality }),
      });
      const archiveData = get().archiveData.map((constellation) => ({
        ...constellation,
        nodes: constellation.nodes.map((node) => node.ID === nodeId ? data.node : node),
      }));
      set({ archiveData, user: data.user });
      get().fetchLearningToday();
      get().fetchPlans();
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: errorMessage(error), data: error.data };
    }
  },

  deleteConstellation: async (constellationId) => {
    try {
      await apiRequest(`/constellations/${constellationId}`, { method: 'DELETE' });
      set({
        graphData: null,
        activeNode: null,
        plans: get().plans.filter((plan) => plan.id !== constellationId),
      });
      await Promise.all([get().fetchArchive(), get().fetchLearningToday(), get().fetchPlans()]);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error), data: error.data };
    }
  },
}));

export default useStore;
