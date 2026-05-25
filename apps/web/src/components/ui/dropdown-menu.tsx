import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuContent = ({
  className,
  ...props
}: DropdownMenuPrimitive.DropdownMenuContentProps) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      className={cn(
        'z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-card p-1 shadow-lg',
        className,
      )}
      sideOffset={6}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
);
export const DropdownMenuItem = ({
  className,
  ...props
}: DropdownMenuPrimitive.DropdownMenuItemProps) => (
  <DropdownMenuPrimitive.Item
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent',
      className,
    )}
    {...props}
  />
);
export const DropdownMenuSeparator = DropdownMenuPrimitive.Separator;
