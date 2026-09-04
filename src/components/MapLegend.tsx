interface LegendItem {
  swatch: React.ReactNode;
  text: string;
}

interface Props {
  island: 1 | 2;
}

export function MapLegend({ island }: Props) {
  const items: LegendItem[] = [
    {
      swatch: (
        <span className="block h-4 w-4 rotate-90 bg-[#9fb87a]/60 [clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]" />
      ),
      text: "Hex tiles show terrain & dice numbers",
    },
    {
      swatch: (
        <span className="block h-4 w-4 rounded border-2 border-dashed border-catan-red bg-parchment" />
      ),
      text: "Dashed = available to build now",
    },

    {
      swatch: <span className="block h-4 w-4 rounded bg-forest-deep" />,
      text: "Solid green = already built",
    },
    {
      swatch: (
        <span className="block h-4 w-4 rounded border-2 border-[#c9a227] bg-forest-deep" />
      ),
      text: "Gold ring = knight joker ready",
    },
    {
      swatch: (
        <span className="relative block h-4 w-4 rounded bg-[#c8bfa8]">
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-catan-red">
            ✕
          </span>
        </span>
      ),
      text: "Crossed out = joker already spent",
    },
  ];

  if (island === 2) {
    items.push({
      swatch: (
        <span className="block h-4 w-4 rounded border border-ink/20 bg-[repeating-linear-gradient(45deg,#d8cdb2_0_2px,#a89a7c_2px_4px)]" />
      ),
      text: "Hatched road = Longest Road space",
    });
  }

  return (
    <div className="mt-3 rounded-2xl border-2 border-ink/10 bg-parchment-deep/40 p-3">
      <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">
        Map key
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.text} className="flex items-center gap-2">
            <span className="shrink-0">{item.swatch}</span>
            <span className="text-xs text-ink-soft">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
