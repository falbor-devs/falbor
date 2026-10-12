"use client"

import { useEffect } from "react"

export function LandingScrollHandler() {
    useEffect(() => {
        
        document.body.classList.remove("overflow-hidden")

        return () => {
            
            document.body.classList.add("overflow-hidden")
        }
    }, [])

    return null
}
