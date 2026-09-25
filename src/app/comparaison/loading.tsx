import {
  EloSkeleton,
  PickerSkeleton,
  StatsSkeleton,
  TabsSkeleton,
} from "./skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
      <PickerSkeleton />
      <TabsSkeleton />
      <EloSkeleton />
      <StatsSkeleton />
    </div>
  );
}
