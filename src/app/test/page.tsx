export function Hero() {
  return (
    <section className="mx-auto max-w-3xl text-center p-12 rounded-2xl bg-white">
      <span className="inline-block text-xs tracking-widest uppercase text-blue-300">Badge</span>
      <h1 className="mt-3 text-5xl font-bold text-gray-900">TechFlowWo</h1>
      <p className="mt-4 text-red-600">Hello world</p>
      <div className="mt-6 flex items-center gap-3 justify-center">
        <button className="px-4 py-2 rounded-md bg-black text-white">Start Free Trial</button>
        <button className="px-4 py-2 rounded-md border">Watch Demo</button>
      </div>
    </section>
  );
}

export default function ImportedComponentWithOverrides() {
  return (
    <div data-reframe-scope="ImportedComponentWithOverrides">
      <div className="p-6 min-h-[730px]">
        <style>
          {
            '[data-reframe-scope="ImportedComponentWithOverrides"] div:nth-child(1) > div:nth-child(2) > section:nth-child(1) > span:nth-child(1) { color: #481de2 !important }\n[data-reframe-scope="ImportedComponentWithOverrides"] div:nth-child(1) > div:nth-child(2) > section:nth-child(1) > div:nth-child(4) > button:nth-child(2) { background-color: #3bc957 !important }'
          }
        </style>
        <div data-sandbox-root>
          <Hero />
        </div>
      </div>
    </div>
  );
}
