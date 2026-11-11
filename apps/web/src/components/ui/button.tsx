import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // Hauteurs généreuses : l'application est aussi utilisée sur tablette,
        // parfois avec des gants.
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-12 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /**
   * Délègue le rendu à l'enfant — typiquement un `<Link>` — en lui transmettant
   * les styles du bouton. Incompatible avec `loading` : voir ci-dessous.
   */
  asChild?: boolean;
  /** Affiche un indicateur et désactive le bouton le temps de l'action. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref,
  ) => {
    const classes = cn(buttonVariants({ variant, size }), className);

    /**
     * En mode `asChild`, Radix `Slot` fusionne les propriétés dans l'unique
     * enfant reçu et lève une exception s'il y en a plusieurs. Injecter ici un
     * indicateur de chargement ferait donc deux enfants — et une page blanche.
     *
     * Les attributs propres au bouton (`disabled`, `type`) ne sont pas non plus
     * transmis : ils n'ont aucun sens sur une ancre, et `disabled` sur un `<a>`
     * est invalide. Un lien qui doit être désactivé ne doit tout simplement pas
     * être rendu comme un lien.
     */
    if (asChild) {
      return (
        <Slot ref={ref} className={classes} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button ref={ref} className={classes} disabled={disabled === true || loading} {...props}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export { buttonVariants };
