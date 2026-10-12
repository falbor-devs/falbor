"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TabsWithSlider } from "~/components/ui/TabsWithSlider";
import DefaultDemo from "~/components/landing/Navbar";
import Footer from "~/components/landing/Footer";
import { ThemeHandler } from "~/components/landing/ThemeHandler";
import { LandingScrollHandler } from "~/components/landing/landing-scroll-handler";
import { useEffect, useRef, useState } from "react";
import { getMarketerCount } from "~/lib/actions/get-marketer-count";

const BENEFITS = [
    {
        icon: "i-ph:users-three",
        title: "We need to grow our marketplace.",
        description:
            "Businesses need great marketers. We need talented people like you to make our marketplace useful and active.",
    },
    {
        icon: "i-ph:megaphone",
        title: "Businesses need marketing.",
        description:
            "Thousands of businesses need help getting customers, growing online, and building their brand. We want to connect them with the right people.",
    },
    {
        icon: "i-ph:handshake",
        title: "We want to connect the right people.",
        description:
            "Our goal is to make it easier for businesses to find talented marketers and for marketers to find businesses that need them.",
    },
    {
        icon: "i-ph:rocket-launch",
        title: "We want to change how marketing works.",
        description:
            "Marketing is changing fast. We are building a new way for businesses and marketers to work together.",
    },
    {
        icon: "i-ph:users-four",
        title: "We are building a community.",
        description:
            "Falbor is not just a marketplace. We want to build a community of marketers who grow, learn, and work together.",
    },
    {
        icon: "i-ph:globe",
        title: "We want to make it global.",
        description:
            "Great marketers are everywhere. We want businesses anywhere in the world to be able to find the right person for the job.",
    },
];

const landingTabs = [
    { id: "business", label: "For Businesses" },
    { id: "marketers", label: "For Marketers" },
];

export default function MarketersLandingPage() {
    const router = useRouter();

    const [marketerCount, setMarketerCount] = useState<number | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    const benefitsSectionRef = useRef<HTMLElement | null>(null);
    const benefitsTrackRef = useRef<HTMLDivElement | null>(null);

    const finalSectionRef = useRef<HTMLElement | null>(null);
    const finalWordsRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        getMarketerCount().then(setMarketerCount);
    }, []);

    /*
     * Horizontal scrolling section
     */
    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        const section = benefitsSectionRef.current;
        const track = benefitsTrackRef.current;

        if (!scrollContainer || !section || !track) return;

        let ticking = false;

        const updateHorizontalScroll = () => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const viewportHeight = scrollContainer.clientHeight;

            const scrollTop = scrollContainer.scrollTop;

            const start = sectionTop;
            const end = sectionTop + sectionHeight - viewportHeight;

            const availableScroll = end - start;

            if (availableScroll <= 0) {
                ticking = false;
                return;
            }

            const progress = Math.min(
                1,
                Math.max(0, (scrollTop - start) / availableScroll),
            );

            const maxTranslate = Math.max(
                0,
                track.scrollWidth - scrollContainer.clientWidth,
            );

            const translateX = maxTranslate * progress;

            track.style.transform = `translate3d(${-translateX}px, 0, 0)`;

            ticking = false;
        };

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateHorizontalScroll);
                ticking = true;
            }
        };

        const handleResize = () => {
            updateHorizontalScroll();
        };

        updateHorizontalScroll();

        scrollContainer.addEventListener("scroll", handleScroll, {
            passive: true,
        });

        window.addEventListener("resize", handleResize);

        return () => {
            scrollContainer.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    /*
     * Final section:
     * The section stays sticky while scrolling.
     * The image stays fixed at the bottom.
     * Words appear one by one according to scroll progress.
     */
    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        const section = finalSectionRef.current;
        const wordsContainer = finalWordsRef.current;

        if (!scrollContainer || !section || !wordsContainer) return;

        const words = Array.from(
            wordsContainer.querySelectorAll<HTMLElement>("[data-word]"),
        );

        let ticking = false;

        const updateWords = () => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const viewportHeight = scrollContainer.clientHeight;

            const scrollTop = scrollContainer.scrollTop;

            const start = sectionTop;
            const end = sectionTop + sectionHeight - viewportHeight;

            const availableScroll = end - start;

            if (availableScroll <= 0) {
                ticking = false;
                return;
            }

            const progress = Math.min(
                1,
                Math.max(0, (scrollTop - start) / availableScroll),
            );

            /*
             * First word is visible immediately.
             * Every additional word is revealed as the user scrolls.
             */
            words.forEach((word, index) => {
                if (index === 0) {
                    word.style.opacity = "1";
                    word.style.transform = "translateY(0)";
                    return;
                }

                const wordProgress = progress * words.length - index;

                const opacity = Math.min(
                    1,
                    Math.max(0, wordProgress),
                );

                word.style.opacity = opacity.toString();

                word.style.transform = `translateY(${(1 - opacity) * 10
                    }px)`;
            });

            ticking = false;
        };

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateWords);
                ticking = true;
            }
        };

        const handleResize = () => {
            updateWords();
        };

        updateWords();

        scrollContainer.addEventListener("scroll", handleScroll, {
            passive: true,
        });

        window.addEventListener("resize", handleResize);

        return () => {
            scrollContainer.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    const STATS = [
        {
            value: marketerCount !== null ? `${marketerCount} +` : "...",
            label: "Marketers ready to help",
        },
        {
            value: "98%",
            label: "Client satisfaction rate",
        },
        {
            value: "$0",
            label: "To join as a marketer",
        },
    ];

    const handleTabChange = (tabId: string) => {
        if (tabId === "business") {
            router.push("/");
        }
    };

    return (
        <div
            ref={scrollContainerRef}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-white text-zinc-900 transition-colors duration-200 dark:bg-black dark:text-white"
        >
            <ThemeHandler />
            <LandingScrollHandler />
            <div className="pointer-events-auto fixed left-1/2 top-2 z-[9999] w-[calc(100%-16px)] max-w-5xl -translate-x-1/2 md:top-4 md:w-[calc(100%-48px)]">
                <div
                    className="w-full rounded-xl border border-zinc-200 dark:border-white/10"
                    style={{ backdropFilter: "blur(20px)" }}
                >
                    <DefaultDemo />
                </div>

                <div className="flex w-full items-center justify-center">
                    <TabsWithSlider
                        tabs={landingTabs}
                        activeTab="marketers"
                        onChange={handleTabChange}
                        className="flex w-fit items-center justify-center rounded-b-xl bg-zinc-100 p-1 dark:bg-zinc-900"
                        sliderClassName="rounded-lg bg-white shadow-sm dark:bg-zinc-800"
                        activeTabClassName="text-zinc-900 dark:text-white"
                        tabClassName="border-0 bg-transparent text-zinc-500 dark:bg-transparent dark:text-zinc-400"
                    />
                </div>
            </div>

            {/* Hero */}
            <section className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-hidden bg-white transition-colors duration-200 dark:bg-black">
                <div
                    aria-hidden="true"
                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat dark:hidden"
                    style={{
                        backgroundImage: "url('/background/teststt25.png')",
                    }}
                />

                <div
                    aria-hidden="true"
                    className="absolute inset-0 z-0 hidden bg-cover bg-center bg-no-repeat dark:block"
                    style={{
                        backgroundImage: "url('/background/teststt25.png')",
                    }}
                />

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-6 pt-35 text-center md:px-6">
                    <h1
                        className="w-full text-2xl leading-normal text-zinc-900 sm:text-4xl md:text-5xl lg:text-6xl dark:text-white"
                        style={{
                            textShadow:
                                "0 0 80px rgba(0,153,255,0.15)",
                        }}
                    >
                        <span className="block">
                            You help businesses with marketing?
                        </span>

                        <span
                            className="block py-1 pb-3"
                            style={{
                                background:
                                    "linear-gradient(90deg, #000000ff 0%, #0099ffff 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            We’d love to work with you.
                        </span>
                    </h1>

                    <p className="mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-400 md:text-lg">
                        Join Falbor as a marketing. Create your profile, and we
                        ill take care of all the details for you to get more
                        business.
                    </p>

                    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
                        <Link
                            href="/signup?role=marketer"
                            className="inline-flex items-center gap-2 rounded-md bg-[#0099ff]/20 px-4 py-1.5 text-md text-[#0099ff] transition-all"
                        >
                            <span className="i-ph:rocket-launch inline-block h-4 w-4" />
                            Join as a Marketer
                        </Link>

                        <Link
                            href="/login?role=marketer"
                            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white/80 px-4 py-1.5 text-md text-zinc-800 backdrop-blur transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-white dark:hover:bg-zinc-800"
                        >
                            Sign In
                        </Link>
                    </div>

                    <div className="mt-16 grid w-full max-w-2xl grid-cols-3 gap-6">
                        {STATS.map((s) => (
                            <div
                                key={s.label}
                                className="flex flex-col items-center gap-1 rounded-xl border border-gray-300 bg-white px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90"
                            >
                                <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                                    {s.value}
                                </span>

                                <span className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                                    {s.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <section
                ref={benefitsSectionRef}
                className="relative h-[500vh] w-full bg-zinc-50 dark:bg-zinc-950"
            >
                <div className="sticky top-0 flex h-screen w-full items-center overflow-hidden">
                    <div className="pointer-events-none absolute left-0 top-0 z-20 flex w-full justify-center pt-15 md:pt-32">
                        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white md:text-7xl">
                            Why we need you?
                        </h2>
                    </div>
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat dark:block"
                        style={{
                            backgroundImage: "url('/background/testst236.png')",
                        }}
                    />
                    <div
                        ref={benefitsTrackRef}
                        className="flex w-max items-center gap-8 pl-[8vw] pr-[8vw] pt-16 will-change-transform md:gap-10 md:pt-20"
                    >
                        {BENEFITS.map((b) => (
                            <div
                                key={b.title}
                                className="flex h-[54vh] w-[48vw] max-w-[760px] min-w-[48vw] shrink-0 flex-col justify-between rounded-xl border border-gray-300 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-900 md:h-[58vh] md:w-[46vw] md:min-w-[46vw] md:p-12 lg:w-[42vw] lg:min-w-[42vw]"
                            >
                                <div>
                                    <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-[#0099ff]/20 md:h-20 md:w-20">
                                        <span
                                            className={`${b.icon} h-8 w-8 text-[#0099ff] md:h-9 md:w-9`}
                                        />
                                    </div>

                                    <h3 className="mt-8 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white md:mt-10 md:text-4xl lg:text-5xl">
                                        {b.title}
                                    </h3>
                                </div>

                                <p className="max-w-xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400 md:text-xl">
                                    {b.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <section
                ref={finalSectionRef}
                className="relative h-[180vh] w-full bg-white dark:bg-black"
            >
                <div className="sticky top-0 h-screen w-full overflow-hidden">
                    <div className="mx-auto grid h-full w-full max-w-7xl grid-cols-1 items-center md:grid-cols-2">
                        <div className="relative order-2 h-[48vh] md:order-1 md:h-screen">
                            <div className="absolute bottom-0 flex w-[185%] left-40 -translate-x-1/2 items-end justify-center">
                                <img
                                    src="/landing/about/profileImages1.png"
                                    alt=""
                                    className="relative z-10 w-[58%] max-w-none object-contain object-bottom"
                                />
                                <img
                                    src="/landing/about/profileImages2.png"
                                    alt=""
                                    className="relative z-20 -ml-[8%] w-[58%] max-w-none object-contain object-bottom"
                                />
                            </div>
                        </div>
                        <div className="relative z-10 order-1 flex items-center px-6 pb-8 md:order-2 md:px-10 lg:px-16">
                            <div
                                ref={finalWordsRef}
                                className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-900 dark:text-white md:text-6xl lg:text-7xl"
                            >
                                {
                                    [
                                        "It",
                                        "started",
                                        "with",
                                        "an",
                                        "idea.",
                                        "Two",
                                        "kids",
                                        "who",
                                        "ran",
                                        "into",
                                        "the",
                                        "same",
                                        "problem.",
                                    ].map((word, index) => (
                                        <span
                                            key={`${word}-${index}`}
                                            data-word
                                            className="mr-[0.22em] inline-block"
                                            style={{
                                                opacity: index === 0 ? 1 : 0,
                                                transform:
                                                    index === 0
                                                        ? "translateY(0)"
                                                        : "translateY(10px)",
                                                transition:
                                                    "opacity 120ms linear, transform 120ms linear",
                                            }}
                                        >
                                            {word}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}