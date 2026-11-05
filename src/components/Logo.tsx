export function Logo() {
  return (
    <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
      <span className="grid size-6 grid-cols-2 gap-[2px] rounded-md bg-primary p-[5px]" aria-hidden>
        <span className="rounded-[1px] bg-primary-foreground" />
        <span className="rounded-[1px] bg-primary-foreground/50" />
        <span className="rounded-[1px] bg-primary-foreground/50" />
        <span className="rounded-[1px] bg-primary-foreground" />
      </span>
      Gridwise
    </span>
  );
}
