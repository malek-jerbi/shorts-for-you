import Head from 'next/head'
import { useState } from 'react'
import styles from './index.module.css'

function extractVideoId(url) {
  const regex =
    /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?=.*v=([a-zA-Z0-9_-]+))(?:\S+)?|#\S+)|(?:youtu\.be\/([a-zA-Z0-9_-]+)))$/
  const match = url.match(regex)
  return match ? match[1] || match[2] : null
}

export default function Home() {
  const [videoLinkInput, setVideoLinkInput] = useState(
    'https://www.youtube.com/watch?v=3qHkcs3kG44'
  )
  const [result, setResult] = useState()
  const [sections, setSections] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setIsLoading(true)
    const videoId = extractVideoId(videoLinkInput)
    if (!videoId) {
      alert('Please enter a valid YouTube video link.')
      return
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId: videoId }),
      })

      let data = await response.json()
      if (response.status !== 200) {
        throw (
          data.error ||
          new Error(`Request failed with status ${response.status}`)
        )
      }

      const roundedSections = data.result.map((section) => ({
        start: Math.round(section.start),
        end: Math.round(section.end),
      }))

      setResult(data.result)
      setSections(roundedSections)
      setVideoLinkInput('')
      setIsLoading(false)
    } catch (error) {
      console.error(error)
      alert(error.message)
      setIsLoading(false)
    }
  }

  function VideoClips({ sections }) {
    return (
      <div className={styles.videoContainer}>
        {sections.map((section, index) => (
          <div key={index} className={styles.videoWrapper}>
            <iframe
              className={styles.video}
              src={`https://www.youtube.com/embed/3qHkcs3kG44?start=${section.start}&end=${section.end}`}
              title={`YouTube video player - Section ${index + 1}`}
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
              allowFullScreen
            ></iframe>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Shorts for you</title>
      </Head>

      <main className={styles.main}>
        <h3>Generate shorts for your youtube video</h3>
        <form onSubmit={onSubmit}>
          <input
            type='text'
            name='videoLink'
            placeholder='Enter a YouTube video link'
            value={videoLinkInput}
            onChange={(e) => setVideoLinkInput(e.target.value)}
          />
          <input type='submit' value='Search transcript' />
        </form>
        <p className={styles.info}>
          Note: Temporarily, this will work only on the first 2-3 minutes of the
          video.
        </p>
        <p className={styles.info}>
          The generated videos are not in a shorts format, they are just clips
          with the start to end selected.
        </p>
        <div className={styles.result}>{JSON.stringify(result)}</div>
        {isLoading && (
          <div className={styles.loadingContainer}>
            <div className={styles.loading}></div>
            <span className={styles.loadingText}>
              Transcribing and retrieving...
            </span>
          </div>
        )}

        {sections && <VideoClips sections={sections} />}
      </main>
    </div>
  )
}
