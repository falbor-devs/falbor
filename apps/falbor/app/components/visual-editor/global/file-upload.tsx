'use client'
import { FileIcon, X } from 'lucide-react'
import Image from 'next/image'
import React, { useState } from 'react'
import { Button } from '../ui/button'

type Props = {
  apiEndpoint?: string 
  onChange: (url?: string) => void
  value?: string
}

const FileUpload = ({ onChange, value }: Props) => {
  const [isUploading, setIsUploading] = useState(false)
  const type = value?.split('.').pop()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        onChange(base64String)
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading file:', error)
      setIsUploading(false)
    }
  }

  if (value) {
    return (
      <div className="flex flex-col justify-center items-center">
        {type !== 'pdf' ? (
          <div className="relative w-40 h-40">
            <Image
              src={value}
              alt="uploaded image"
              className="object-contain"
              fill
            />
          </div>
        ) : (
          <div className="relative flex items-center p-2 mt-2 rounded-md bg-background/10">
            <FileIcon />
            <a
              href={value}
              target="_blank"
              rel="noopener_noreferrer"
              className="ml-2 text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
            >
              View PDF
            </a>
          </div>
        )}
        <Button
          onClick={() => onChange('')}
          variant="ghost"
          type="button"
        >
          <X className="h-4 w-4" />
          Remove Image
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full bg-muted/30 p-8 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-4">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
        disabled={isUploading}
      />
      <label
        htmlFor="file-upload"
        className="cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-all"
      >
        {isUploading ? 'Processing...' : 'Upload Image'}
      </label>
      <p className="text-xs text-muted-foreground">
        Image will be saved directly to your database
      </p>
    </div>
  )
}

export default FileUpload
