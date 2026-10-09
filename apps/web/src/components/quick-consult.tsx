import { Search } from "lucide-react";
import Form from "next/form";
import type { NeedInfo } from "@/lib/types";
import { BudgetField } from "./budget-field";

/** The short version of the consultation form, for the home page. It lands on /konsultasi with results. */
export function QuickConsult({ needs }: { needs: NeedInfo[] }) {
  return (
    <Form action="/konsultasi#hasil" className="card space-y-5 p-5 shadow-sm sm:p-6" aria-label="Konsultasi cepat">
      <div>
        <label htmlFor="quick-need" className="field-label">
          Untuk apa laptopnya?
        </label>
        <select id="quick-need" name="kebutuhan" required defaultValue="" className="field-input">
          <option value="" disabled>
            Pilih kebutuhan
          </option>
          {needs.map((need) => (
            <option key={need.id} value={need.id}>
              {need.name}
            </option>
          ))}
        </select>
      </div>
      <BudgetField suggestions={false} />
      <button type="submit" className="btn btn-primary w-full">
        <Search aria-hidden="true" className="size-5" />
        Cari laptop
      </button>
    </Form>
  );
}
