'use client'

import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

interface ScrollEdgesOptions {
    axis?: 'x' | 'y'
}

interface ScrollEdges {
    top: boolean
    bottom: boolean
    left: boolean
    right: boolean
}

export function useScrollEdges(
    ref: RefObject<HTMLElement | null>,
    options: ScrollEdgesOptions = {},
): ScrollEdges {
    const { axis = 'y' } = options

    const [edges, setEdges] = useState<ScrollEdges>({
        top: false,
        bottom: false,
        left: false,
        right: false,
    })

    useEffect(() => {
        const element = ref.current
        if (!element) return

        const updateEdges = () => {
            const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } =
                element

            setEdges({
                top: scrollTop > 0,
                bottom: scrollTop + clientHeight < scrollHeight - 1,
                left: scrollLeft > 0,
                right: scrollLeft + clientWidth < scrollWidth - 1,
            })
        }

        updateEdges()

        element.addEventListener('scroll', updateEdges, { passive: true })

        const observer = new ResizeObserver(updateEdges)
        observer.observe(element)

        return () => {
            element.removeEventListener('scroll', updateEdges)
            observer.disconnect()
        }
    }, [ref, axis])

    return edges
}