import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'excludeSelectedTax', pure: true })
export class ExcludeSelectedTaxPipe implements PipeTransform {
  transform(
    options: any[] | null | undefined,
    usedIds: string[] | Set<string> | null | undefined,
    keepId?: string | null | undefined
  ): any[] {
    const list = options ?? [];
    const used = new Set<string>(
      Array.isArray(usedIds) ? usedIds.filter(Boolean).map(String) : Array.from(usedIds ?? [])
    );
    const keep = keepId != null ? String(keepId) : null;

    // ✅ filter out used in other rows, but keep the current row’s selected option
    return list.filter(o => {
      const id = o?.Id != null ? String(o.Id) : '';
      return !id || !used.has(id) || (keep !== null && id === keep);
    });
  }
}
