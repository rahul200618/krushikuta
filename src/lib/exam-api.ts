// Exam Portal API client — calls /api/exam with action-based routing

const EXAM_API = import.meta.env.VITE_EXAM_API_URL || '/api/exam';

async function examApi(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch(EXAM_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API error');
  }
  return res.json();
}

export const checkMobile = (mobile: string) => examApi('check-mobile', { mobile });
export const getProfile = (userId: string) => examApi('get-profile', { userId });
export const saveProfile = (userId: string, profile: Record<string, unknown>) => examApi('save-profile', { userId, profile });
export const submitRegistration = (payload: Record<string, unknown>) => examApi('submit-registration', payload);

export const listMockTests = () => examApi('list-mock-tests');
export const getMockQuestions = (testId: number) => examApi('get-mock-questions', { testId });

export const startTest = (payload: { userId: string; testId: number; name?: string; phone?: string; email?: string; college?: string }) =>
  examApi('start-test', payload);

export const submitTest = (submissionId: number, testId: number, answers: Record<string, number>) =>
  examApi('submit-test', { submissionId, testId, answers });

export const getUserPerformance = (userId: string) => examApi('get-user-performance', { userId });

export const saveMockTest = (test: Record<string, unknown>) => examApi('save-mock-test', { test });
export const deleteMockTest = (testId: number) => examApi('delete-mock-test', { testId });

export const saveMockQuestion = (question: Record<string, unknown>) => examApi('save-mock-question', { question });
export const deleteMockQuestion = (questionId: number) => examApi('delete-mock-question', { questionId });

export const grantAccess = (payload: { userId: string; testId: number; email: string; amount?: number; paymentMethod?: string }) =>
  examApi('grant-access', payload);
export const revokeAccess = (userId: string, testId: number) => examApi('revoke-access', { userId, testId });
export const listUserAccess = (search?: string) => examApi('list-user-access', { search });
export const listStudentProfiles = (search?: string) => examApi('list-student-profiles', { search });
export const resetStudentDevice = (userId: string) => examApi('reset-student-device', { userId });
export const changeUserPassword = (userId: string, newPassword: string) => examApi('change-user-password', { userId, newPassword });

export const checkUserAccess = (userId: string, testIds: number[], email?: string) => examApi('check-user-access', { userId, testIds, email });
export const debugUserAccess = (userId: string, email?: string) => examApi('debug-user-access', { userId, email });

export const submitPaymentRequest = (userEmail: string, utr: string, amount: number) =>
  examApi('submit-payment-request', { userEmail, utr, amount });
export const listPaymentRequests = () => examApi('list-payment-requests');
export const updatePaymentRequest = (requestId: number, status: string, userId?: string, testId?: number) =>
  examApi('update-payment-request', { requestId, status, userId, testId });

export default examApi;
