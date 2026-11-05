import AsyncStorage from '@react-native-async-storage/async-storage';

// Saved jobs are kept on the phone itself (no server, no account, no keys).
const STORAGE_KEY = 'nnit_saved_jobs';

export const jobKey = job => job.link || job.reference || `${job.title}|${job.company}`;

export async function getSavedJobs() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    return [];
  }
}

async function writeSavedJobs(list) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function isJobSaved(job) {
  const key = jobKey(job);
  const list = await getSavedJobs();
  return list.some(item => jobKey(item) === key);
}

export async function saveJob(job) {
  const key = jobKey(job);
  const list = await getSavedJobs();
  if (list.some(item => jobKey(item) === key)) return list;
  const next = [{ ...job, savedAt: new Date().toISOString() }, ...list];
  await writeSavedJobs(next);
  return next;
}

export async function removeSavedJob(job) {
  const key = jobKey(job);
  const next = (await getSavedJobs()).filter(item => jobKey(item) !== key);
  await writeSavedJobs(next);
  return next;
}
