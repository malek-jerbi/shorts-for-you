import Head from 'next/head'
import { useState } from 'react'
import styles from './index.module.css'

export default function Home() {
  const [topicInput, setTopicInput] = useState('')
  const [result, setResult] = useState()
  const [sections, setSections] = useState(null)

  async function onSubmit(event) {
    event.preventDefault()
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: topicInput }),
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
      setTopicInput('')
    } catch (error) {
      // Consider implementing your own error handling logic here
      console.error(error)
      alert(error.message)
    }
  }

  function VideoClips({ sections }) {
    return (
      <div className={styles.videoContainer}>
        {sections.map((section, index) => (
          <div key={index} className={styles.videoWrapper}>
            <iframe
              className={styles.video}
              src={`https://www.youtube.com/embed/GvX-heRWFfA?start=${section.start}&end=${section.end}`}
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
        <title>Podcast Transcript Search</title>
      </Head>

      <main className={styles.main}>
        <h3>Find podcast content</h3>
        <form onSubmit={onSubmit}>
          <input
            type='text'
            name='topic'
            placeholder='Enter a topic'
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
          />
          <input type='submit' value='Search transcript' />
        </form>
        <div className={styles.result}>{JSON.stringify(result)}</div>

        {sections && <VideoClips sections={sections} />}
      </main>
    </div>
  )
}
