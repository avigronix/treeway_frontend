import { useQuery } from '@tanstack/react-query';
import { companyApi } from '@/api/company';
import { qk } from '@/api/keys';

/** Company contact and payment details (public). */
export function useCompany() {
  return useQuery({
    queryKey: qk.company,
    queryFn: ({ signal }) => companyApi.detail(signal),
    staleTime: 10 * 60_000,
  });
}

/** Plan numbers for display (activation amount, PIN price, limits). */
export function useConfig() {
  return useQuery({
    queryKey: qk.config,
    queryFn: ({ signal }) => companyApi.config(signal),
    staleTime: 10 * 60_000,
  });
}
