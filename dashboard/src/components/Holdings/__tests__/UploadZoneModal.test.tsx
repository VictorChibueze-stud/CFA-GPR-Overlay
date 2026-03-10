import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

jest.mock('@/hooks/usePortfolioUpload', () => ({
  usePortfolioUpload: () => ({
    parseFile: jest.fn(() => Promise.resolve({ holdings: null, error: null })),
  }),
}))

jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
  }),
}))

import UploadZoneModal from '../UploadZone'

test('Import Portfolio button opens dialog with instructions', async () => {
  const container = document.createElement('div')
  document.body.appendChild(container)

  await act(async () => {
    createRoot(container).render(<UploadZoneModal onUploadSuccess={jest.fn()} />)
  })

  // Button renders
  const button = Array.from(container.querySelectorAll('button')).find(b => /Import Portfolio/i.test(b.textContent || ''))
  expect(button).toBeTruthy()

  // Click to open
  await act(async () => {
    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  // Dialog title visible
  const title = Array.from(container.querySelectorAll('h2')).find(h => h.textContent === 'Import Portfolio')
  expect(title).toBeTruthy()

  // Instruction text present
  const instr = Array.from(container.querySelectorAll('p')).find(p => /Upload a CSV with columns:/i.test(p.textContent || ''))
  expect(instr).toBeTruthy()
})
