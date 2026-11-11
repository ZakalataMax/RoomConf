import type { RoomPreset } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export class APIError extends Error {
  statusCode?: number
  response?: Response

  constructor(
    message: string,
    statusCode?: number,
    response?: Response
  ) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.response = response
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `API request failed: ${response.statusText}`
    try {
      const errorData = await response.json()
      if (errorData.detail) {
        errorMessage = errorData.detail
      }
    } catch {
    }
    throw new APIError(errorMessage, response.status, response)
  }
  return await response.json()
}

export async function fetchPresets(): Promise<RoomPreset[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/presets`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await handleResponse<RoomPreset[]>(response)
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIError(
        'Unable to connect to the server. Please ensure the backend is running.',
        0
      )
    }
    if (error instanceof APIError) {
      throw error
    }
    throw new APIError(`Failed to fetch presets: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function fetchPreset(id: string): Promise<RoomPreset> {
  if (!id) {
    throw new APIError('Preset ID is required')
  }
  try {
    const response = await fetch(`${API_BASE_URL}/presets/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await handleResponse<RoomPreset>(response)
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIError(
        'Unable to connect to the server. Please ensure the backend is running.',
        0
      )
    }
    if (error instanceof APIError) {
      throw error
    }
    throw new APIError(`Failed to fetch preset: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function savePreset(preset: RoomPreset): Promise<RoomPreset> {
  try {
    const response = await fetch(`${API_BASE_URL}/presets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preset),
    })
    return await handleResponse<RoomPreset>(response)
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIError(
        'Unable to connect to the server. Please ensure the backend is running.',
        0
      )
    }
    if (error instanceof APIError) {
      throw error
    }
    throw new APIError(`Failed to save preset: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

