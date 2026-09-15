import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Design toast: a single dark pill at the bottom centre, 13px/700, ~1.8s.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-center"
      duration={1800}
      offset={120}
      mobileOffset={120}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group toast flex w-auto max-w-[calc(100vw-48px)] items-center gap-2 rounded-full bg-foreground px-[18px] py-[10px] text-[13px] font-bold text-background shadow-[0_8px_24px_rgba(0,0,0,.2)]",
          title: "text-[13px] font-bold",
          description: "text-[12px] font-medium opacity-80",
          icon: "hidden",
          actionButton: "rounded-full bg-primary px-3 py-1 text-[12px] font-bold text-white",
          cancelButton: "rounded-full bg-secondary px-3 py-1 text-[12px] font-bold text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
