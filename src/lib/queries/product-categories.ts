"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";

export const productCategoriesQueryKey = ["product-categories"] as const;

export type ProductCategoryDto = {
  id: string;
  name: string;
  description: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ListProductCategoriesResponse = {
  categories: ProductCategoryDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type CreateProductCategoryPayload = {
  name: string;
  description?: string;
};

export type UpdateProductCategoryPayload = {
  name: string;
  description?: string;
};

export function useProductCategoriesQuery(options?: {
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  const includeArchived = options?.includeArchived ?? false;
  const page = Math.max(1, Math.floor(options?.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(options?.pageSize ?? 10)));
  const queryString = `includeArchived=${includeArchived ? "1" : "0"}&page=${page}&pageSize=${pageSize}`;
  return useQuery({
    queryKey: [...productCategoriesQueryKey, { includeArchived, page, pageSize }] as const,
    queryFn: () =>
      fetchJson<ListProductCategoriesResponse>(`${apiUrl("/product-categories")}?${queryString}`, {
        method: "GET",
      }),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateProductCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductCategoryPayload) =>
      fetchJson<ProductCategoryDto>(apiUrl("/product-categories"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productCategoriesQueryKey });
    },
  });
}

export function useUpdateProductCategoryMutation(categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProductCategoryPayload) =>
      fetchJson<ProductCategoryDto>(apiUrl(`/product-categories/${categoryId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productCategoriesQueryKey });
    },
  });
}

export function useArchiveProductCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { categoryId: string }) =>
      fetchJson<ProductCategoryDto>(apiUrl(`/product-categories/${payload.categoryId}/archive`), {
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productCategoriesQueryKey });
    },
  });
}

export function useRestoreProductCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { categoryId: string }) =>
      fetchJson<ProductCategoryDto>(apiUrl(`/product-categories/${payload.categoryId}/restore`), {
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productCategoriesQueryKey });
    },
  });
}

