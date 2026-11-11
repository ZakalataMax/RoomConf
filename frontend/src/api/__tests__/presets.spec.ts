import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPresets, fetchPreset, savePreset } from '../presets'
import type { RoomPreset } from '@/types'

const preset: RoomPreset = {
  id: 'p1',
  name: 'Test',
  materials: {
    wall: { type: 'paint', color: '#fff', roughness: 0.5 },
    floor: { preset: 'wood' },
  },
  lighting: { intensity: 1, colorTemperature: 6500, preset: null },
  environment: 'day',
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

const fetchMock = vi.fn()

describe('presets API client', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('fetchPresets GETs /presets and returns the parsed list', async () => {
    fetchMock.mockResolvedValue(jsonResponse([preset]))
    await expect(fetchPresets()).resolves.toEqual([preset])
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/presets$/),
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
    )
  })

  it('surfaces the backend "detail" message and status code on errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: 'Preset p1 not found' }, { status: 404, statusText: 'Not Found' })
    )
    await expect(fetchPreset('p1')).rejects.toMatchObject({
      name: 'APIError',
      message: 'Preset p1 not found',
      statusCode: 404,
    })
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/presets\/p1$/), expect.anything())
  })

  it('falls back to statusText when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('oops', { status: 500, statusText: 'Server Error' }))
    await expect(fetchPresets()).rejects.toMatchObject({
      message: 'API request failed: Server Error',
      statusCode: 500,
    })
  })

  it('maps network failures to a friendly error with status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(fetchPresets()).rejects.toMatchObject({
      statusCode: 0,
      message: expect.stringContaining('Unable to connect to the server'),
    })
  })

  it('fetchPreset rejects immediately without an id', async () => {
    await expect(fetchPreset('')).rejects.toThrow('Preset ID is required')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('savePreset POSTs the preset as JSON and returns the saved copy', async () => {
    const saved = { ...preset, createdAt: '2026-01-01T00:00:00Z' }
    fetchMock.mockResolvedValue(jsonResponse(saved))
    await expect(savePreset(preset)).resolves.toEqual(saved)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toMatch(/\/presets$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(preset)
  })
})
