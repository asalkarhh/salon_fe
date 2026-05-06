import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";

export interface DataColumn<TData> {
  id: string;
  header: string;
  cell: (row: TData) => React.ReactNode;
  sortingValue?: (row: TData) => string | number;
}

interface DataTableProps<TData> {
  data: TData[];
  columns: DataColumn<TData>[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  mobileCard: (row: TData) => React.ReactNode;
}

export function DataTable<TData>({
  data,
  columns,
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "Create or adjust your filters to see results here.",
  mobileCard,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const tableColumns = useMemo(
    () =>
      columns.map((column) => ({
        id: column.id,
        accessorFn: (row: TData) => row,
        header: () => column.header,
        cell: ({ row }: { row: { original: TData } }) => column.cell(row.original),
        sortingFn: (
          left: { original: TData },
          right: { original: TData },
        ) => {
          const leftValue = column.sortingValue?.(left.original) ?? "";
          const rightValue = column.sortingValue?.(right.original) ?? "";
          return String(leftValue).localeCompare(String(rightValue), undefined, {
            numeric: true,
          });
        },
      })),
    [columns],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (loading) {
    return <LoadingSpinner label="Loading records..." />;
  }

  if (!data.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:hidden">
        {data.map((row, index) => (
          <div key={index}>{mobileCard(row)}</div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-panel lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-secondary/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "inline-flex items-center gap-2",
                            header.column.getCanSort() ? "cursor-pointer" : "cursor-default",
                          )}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border/80">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="align-top">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-4 text-sm text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
