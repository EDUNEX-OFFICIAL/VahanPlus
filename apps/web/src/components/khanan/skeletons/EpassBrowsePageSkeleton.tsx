import { memo } from 'react';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { ConsignerPickerSkeleton } from '@/components/khanan/skeletons/ConsignerPickerSkeleton';
import { EpassFiltersSkeleton } from '@/components/khanan/skeletons/EpassFiltersSkeleton';
import { EpassReportMetaBarSkeleton } from '@/components/khanan/skeletons/EpassReportMetaBarSkeleton';
import { EpassTableSkeleton } from '@/components/khanan/skeletons/EpassTableSkeleton';
import { VehicleStatusMetaBarSkeleton } from '@/components/khanan/skeletons/VehicleStatusMetaBarSkeleton';

interface EpassBrowsePageSkeletonProps {
  showConsignerPicker?: boolean;
  wrapPageStack?: boolean;
}

function EpassBrowseLoadingBlocks({
  showConsignerPicker = false,
  showTable = true,
}: {
  showConsignerPicker?: boolean;
  showTable?: boolean;
}) {
  return (
    <>
      <EpassReportMetaBarSkeleton />
      <EpassFiltersSkeleton />
      {showConsignerPicker ? <ConsignerPickerSkeleton /> : null}
      {showTable ? <EpassTableSkeleton /> : null}
    </>
  );
}

export const EpassBrowsePageSkeleton = memo(function EpassBrowsePageSkeleton({
  showConsignerPicker = false,
  wrapPageStack = true,
}: EpassBrowsePageSkeletonProps) {
  const blocks = <EpassBrowseLoadingBlocks showConsignerPicker={showConsignerPicker} />;
  return wrapPageStack ? <PageStack>{blocks}</PageStack> : blocks;
});

export const EpassBrowsePageLoading = memo(function EpassBrowsePageLoading(
  props: EpassBrowsePageSkeletonProps,
) {
  return <EpassBrowsePageSkeleton {...props} />;
});

export const ConsigneePageLoading = memo(function ConsigneePageLoading({
  showConsignerPicker,
  showTable,
}: {
  showConsignerPicker: boolean;
  showTable: boolean;
}) {
  return (
    <PageStack>
      <EpassBrowseLoadingBlocks showConsignerPicker={showConsignerPicker} showTable={showTable} />
    </PageStack>
  );
});

function VehicleStatusLoadingBlocks() {
  return (
    <>
      <VehicleStatusMetaBarSkeleton />
      <EpassTableSkeleton rows={10} />
    </>
  );
}

export const VehicleStatusPageSkeleton = memo(function VehicleStatusPageSkeleton() {
  return (
    <PageStack>
      <VehicleStatusLoadingBlocks />
    </PageStack>
  );
});

export const VehicleStatusPageLoading = memo(function VehicleStatusPageLoading() {
  return <VehicleStatusLoadingBlocks />;
});
