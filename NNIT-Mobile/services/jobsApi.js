import axios from 'axios';

// NNIT Jobs API. Set EXPO_PUBLIC_NNIT_JOBS_API_URL to point the app at another API (for example a local one while testing).
export const API_URL = (
  process.env.EXPO_PUBLIC_NNIT_JOBS_API_URL || 'https://nnit-job-api-production.up.railway.app'
).replace(/\/+$/, '');

const client = axios.create({ baseURL: API_URL, timeout: 45000 });

function describeError(error, notFoundMessage) {
  if (error.response) {
    if (error.response.status === 502) {
      return 'The job sources could not be reached right now. Please try again in a moment.';
    }
    if (error.response.status === 404) return notFoundMessage;
    return `The Jobs API returned HTTP ${error.response.status}.`;
  }
  return 'Could not reach the NNIT Jobs API. Check your internet connection and try again.';
}

// workType: '' (all), 'remote', 'hybrid' or 'onsite'
export async function searchJobs({ query, location = '', workType = '' }) {
  const params = { q: query.trim() };
  if (location.trim()) params.location = location.trim();
  if (workType) params.work_type = workType;
  try {
    const { data } = await client.get('/jobs/search', { params });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(describeError(error, 'No jobs were found.'));
  }
}

// Full description and key facts of a Bundesagentur vacancy, shown inside the app.
export async function getJobDetail(reference) {
  try {
    const { data } = await client.get('/jobs/detail', { params: { ref: reference } });
    return { facts: data.facts || [], description: data.description || '' };
  } catch (error) {
    throw new Error(describeError(error, 'The full description is not available for this vacancy right now.'));
  }
}
