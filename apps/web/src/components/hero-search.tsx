import { Search } from "lucide-react";
import Form from "next/form";

/** The search bar on the home page. It opens the catalog with the words typed, which the API matches against model names. */
export function HeroSearch() {
  return (
    <Form action="/laptop" role="search" className="search-field mx-auto h-14 max-w-2xl py-1.5 pl-5 pr-1.5">
      <Search aria-hidden="true" className="size-5 shrink-0 text-ink-3" />
      <label htmlFor="cari-beranda" className="sr-only">
        Cari laptop
      </label>
      <input
        id="cari-beranda"
        name="q"
        type="search"
        maxLength={80}
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Cari laptop atau merek"
        className="text-base sm:text-lg"
      />
      <button type="submit" className="btn btn-primary">
        Cari
      </button>
    </Form>
  );
}
