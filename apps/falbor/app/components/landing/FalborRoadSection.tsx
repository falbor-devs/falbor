"use client";

export default function FalborRoadSection() {
    return (
        <div className="relative w-full py-32 flex flex-col items-center justify-center bg-white border-t border-zinc-200">
            <div className="w-full px-12 z-10">
                <h2 className="text-[2.5rem] leading-[1.2] font-semibold text-[#1a1a1a] mb-16 text-center tracking-tight">
                    Falbor opens the door
                    <br />
                    <span className="text-[#8c8c8c]">to meaningful opportunities.</span>
                </h2>
                <div className="w-full flex flex-col border border-zinc-200 rounded-[15px] overflow-hidden">
                    {}

                    {}
                    <div className="w-full aspect-video md:aspect-[4/1] flex items-center justify-center relative border-b border-zinc-200">
                        <img
                            src="/landing/mcp.png"
                            alt="Feature 3 Full Width"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `<span class="text-sm font-medium text-gray-400">Full Width</span>`;
                            }}
                        />
                    </div>
                    {}
                    <div className="w-full aspect-video md:aspect-[4/1] flex items-center justify-center relative bg-zinc-50">
                        <img
                            src="/landing/models.png"
                            alt="Feature 4 Full Width"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `<span class="text-sm font-medium text-gray-400">Additional Horizontal Feature</span>`;
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}