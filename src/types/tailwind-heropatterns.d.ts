declare module "tailwind-heropatterns" {
  import type createPlugin from "tailwindcss/plugin";

  export interface HeroPatternOptions {
    patterns?: string[];
    colors?: Record<string, string>;
    opacity?: Record<string, string | number>;
    sizes?: Record<string, string | number>;
  }

  type TailwindPlugin = ReturnType<typeof createPlugin>;

  const heropatterns: (options?: HeroPatternOptions) => TailwindPlugin;
  export default heropatterns;
}
