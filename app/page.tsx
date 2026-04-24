'use client'

import { useEffect, useState } from 'react'
import { fetchWeatherApi } from 'openmeteo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  MapPin,
  Droplets,
  Wind,
  Eye,
  Moon,
  Sun,
  Navigation,
  Gauge,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ForecastDay {
  date: string
  maxTemp: number
  minTemp: number
  rain: number
  wind: number
}

interface ChartData {
  time: string
  temp: number
}

interface WeatherState {
  temperature: number
  rain: number
  cloudCover: number
  humidity?: number
  windSpeed?: number
  visibility?: number
  pressure?: number
}

export default function WeatherApp() {
  const [city, setCity] = useState('')
  const [locationName, setLocationName] = useState('বর্তমান অবস্থান')
  const [weather, setWeather] = useState<WeatherState | null>(null)
  const [hourlyData, setHourlyData] = useState<ChartData[]>([])
  const [weeklyForecast, setWeeklyForecast] = useState<ForecastDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
    getCurrentLocationWeather()
  }, [])

  const fetchWeatherByCoords = async (
    lat: number,
    lon: number,
    label = 'বর্তমান অবস্থান'
  ) => {
    try {
      setLoading(true)
      setError('')

      const params = {
        latitude: lat,
        longitude: lon,
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'sunrise',
          'sunset',
          'uv_index_max',
          'rain_sum',
          'precipitation_probability_max',
          'wind_speed_10m_max',
        ],
        hourly: [
          'temperature_2m',
          'cloud_cover',
          'precipitation',
          'relative_humidity_2m',
          'apparent_temperature',
          'precipitation_probability',
          'visibility',
          'wind_speed_10m',
          'wind_gusts_10m',
        ],
        current: [
          'temperature_2m',
          'rain',
          'cloud_cover',
          'relative_humidity_2m',
          'apparent_temperature',
          'pressure_msl',
          'surface_pressure',
          'wind_speed_10m',
          'wind_direction_10m',
          'wind_gusts_10m',
        ],
        forecast_days: 7,
      }

      const url = 'https://api.open-meteo.com/v1/forecast'
      const responses = await fetchWeatherApi(url, params)
      const response = responses[0]

      const utcOffsetSeconds = response.utcOffsetSeconds()
      const current = response.current()
      const hourly = response.hourly()
      const daily = response.daily()

      if (!current || !hourly) {
        throw new Error('আবহাওয়ার তথ্য পাওয়া যায়নি')
      }

      const totalHours = Math.min(
        8,
        (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval()
      )

      const hourlyTemp = hourly.variables(0)?.valuesArray() || []

      const chart = Array.from({ length: totalHours }, (_, i) => ({
        time: new Date(
          (Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) *
            1000
        ).toLocaleTimeString('bn-BD', {
          hour: '2-digit',
        }),
        temp: Math.round(hourlyTemp[i] || 0),
      }))

      setHourlyData(chart)

      if (daily) {
        const dailyMax = daily.variables(1)?.valuesArray() || []
        const dailyMin = daily.variables(2)?.valuesArray() || []
        const dailyRain = daily.variables(6)?.valuesArray() || []
        const dailyWind = daily.variables(8)?.valuesArray() || []

        const next7Days = Array.from({ length: 7 }, (_, i) => ({
          date: new Date(
            (Number(daily.time()) + i * daily.interval() + utcOffsetSeconds) *
              1000
          ).toLocaleDateString('bn-BD', {
            weekday: 'short',
          }),
          maxTemp: Math.round(dailyMax[i] || 0),
          minTemp: Math.round(dailyMin[i] || 0),
          rain: Math.round(dailyRain[i] || 0),
          wind: Math.round(dailyWind[i] || 0),
        }))

        setWeeklyForecast(next7Days)
      }

      setLocationName(label)

      setWeather({
        temperature: Math.round(current.variables(0)?.value() || 0),
        rain: current.variables(1)?.value() || 0,
        cloudCover: Math.round(current.variables(2)?.value() || 0),
        humidity: Math.round(current.variables(3)?.value() || 0),
        pressure: Math.round(current.variables(5)?.value() || 0),
        windSpeed: Math.round(current.variables(7)?.value() || 0),
        visibility: Math.round(hourly.variables(6)?.valuesArray()?.[0] || 0),
      })
    } catch (err: any) {
      setError(err.message || 'আবহাওয়া লোড করতে ব্যর্থ হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLocationWeather = () => {
    if (!navigator.geolocation) {
      setError('ব্রাউজার লোকেশন সাপোর্ট করে না')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        await fetchWeatherByCoords(latitude, longitude, 'আমার অবস্থান')
      },
      () => {
        setError('লোকেশন অনুমতি দেওয়া হয়নি। অনুগ্রহ করে শহরের নাম লিখে সার্চ করুন।')
        setLoading(false)
      }
    )
  }

  const getWeather = async () => {
    if (!city) return

    try {
      setLoading(true)
      setError('')

      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`
      )

      const geoData = await geoRes.json()

      if (!geoData.results || !geoData.results.length) {
        throw new Error('শহর খুঁজে পাওয়া যায়নি')
      }

      const place = geoData.results[0]

      await fetchWeatherByCoords(
        place.latitude,
        place.longitude,
        `${place.name}, ${place.country}`
      )
    } catch (err: any) {
      setError(err.message || 'সার্চ ব্যর্থ হয়েছে')
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8 transition-all duration-300">
  <div className="max-w-7xl mx-auto space-y-6">

    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          ওয়েদার প্রো
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          ৭ দিনের পূর্বাভাসসহ স্মার্ট লাইভ আবহাওয়া ড্যাশবোর্ড
        </p>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl shadow-sm bg-white/90 dark:bg-gray-800/90 self-start sm:self-auto"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
    </div>

    {/* Main Card */}
    <Card className="border border-white/20 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden">
      <CardHeader>
        <CardTitle className="text-center text-xl sm:text-2xl font-semibold tracking-tight">
          লাইভ আবহাওয়া ড্যাশবোর্ড
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Search Section */}
        <div className="flex flex-col md:flex-row gap-3">
          <Input
            className="h-11 sm:h-12 rounded-2xl border-slate-200 dark:border-slate-700 text-sm sm:text-base shadow-sm"
            placeholder="শহরের নাম লিখুন... উদাহরণ: ঢাকা"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && getWeather()}
          />

          <div className="flex gap-3 w-full md:w-auto">
            <Button
              onClick={getWeather}
              disabled={loading}
              className="h-11 sm:h-12 flex-1 md:flex-none rounded-2xl px-6 shadow-md"
            >
              <Search className="h-4 w-4" />
            </Button>

            <Button
              onClick={getCurrentLocationWeather}
              disabled={loading}
              variant="outline"
              className="h-11 sm:h-12 flex-1 md:flex-none rounded-2xl"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-center font-medium text-sm sm:text-base">
            {error}
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-10 w-40 sm:w-48 mx-auto" />
            <Skeleton className="h-28 w-28 sm:h-32 sm:w-32 mx-auto rounded-full" />
            <Skeleton className="h-14 sm:h-16 w-32 sm:w-40 mx-auto" />
          </div>
        )}

        {/* Weather Content */}
        {weather && !loading && (
          <div className="space-y-6">

            {/* Main Weather */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <MapPin className="h-5 w-5" />
                <h2 className="text-2xl sm:text-3xl font-bold">
                  {locationName}
                </h2>
              </div>

              <p className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white">
                {weather.temperature}°C
              </p>

              <p className="text-sm sm:text-lg">
                মেঘের পরিমাণ: {weather.cloudCover}%
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md shadow-sm text-center">
                <Droplets className="mx-auto mb-2 h-5 w-5" />
                <p className="text-sm">বৃষ্টি</p>
                <p className="font-bold text-sm sm:text-base">
                  {weather.rain} mm
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md shadow-sm text-center">
                <Wind className="mx-auto mb-2 h-5 w-5" />
                <p className="text-sm">বাতাস</p>
                <p className="font-bold text-sm sm:text-base">
                  {weather.windSpeed} km/h
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md shadow-sm text-center">
                <Eye className="mx-auto mb-2 h-5 w-5" />
                <p className="text-sm">আর্দ্রতা</p>
                <p className="font-bold text-sm sm:text-base">
                  {weather.humidity}%
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md shadow-sm text-center">
                <Gauge className="mx-auto mb-2 h-5 w-5" />
                <p className="text-sm">চাপ</p>
                <p className="font-bold text-sm sm:text-base">
                  {weather.pressure} hPa
                </p>
              </div>
            </div>

            {/* Temperature Chart */}
            <div>
              <h3 className="font-semibold mb-4 text-lg sm:text-xl tracking-tight">
                তাপমাত্রার সারাংশ
              </h3>

              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={hourlyData}>
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="temp"
                      stroke="#2563eb"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly Forecast */}
            <div>
              <h3 className="font-semibold mb-4 text-lg sm:text-xl tracking-tight flex items-center justify-center sm:justify-start gap-2">
                <Sun className="h-5 w-5 text-yellow-500" />
                ৭ দিনের পূর্বাভাস
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                {weeklyForecast.map((day, index) => (
                  <div
                    key={index}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md shadow-sm text-center hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex justify-center mb-3">
                      <Sun className="h-6 w-6 text-yellow-500" />
                    </div>

                    <p className="font-semibold text-sm sm:text-base">
                      {day.date}
                    </p>

                    <p className="text-base sm:text-lg font-bold flex items-center justify-center gap-1 mt-2">
                      <Sun className="h-4 w-4 text-orange-500" />
                      {day.maxTemp}°
                    </p>

                    <p className="text-xs sm:text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
                      <Moon className="h-4 w-4 text-blue-500" />
                      সর্বনিম্ন: {day.minTemp}°
                    </p>

                    <p className="text-xs sm:text-sm flex items-center justify-center gap-1 mt-2">
                      <Droplets className="h-4 w-4 text-cyan-500" />
                      বৃষ্টি: {day.rain} mm
                    </p>

                    <p className="text-xs sm:text-sm flex items-center justify-center gap-1 mt-1">
                      <Wind className="h-4 w-4 text-gray-500" />
                      বাতাস: {day.wind} km/h
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-6 border-t border-slate-200 dark:border-slate-700">
  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
  © {new Date().getFullYear()} ওয়েদার প্রো | সর্বস্বত্ব সংরক্ষিত
</p>

  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
    Developed & Maintained by{" "}
    <a
      href="https://azijul.pro.bd/"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-blue-600 hover:text-cyan-500 transition-colors duration-300 underline underline-offset-4"
    >
     Md Azijul Hakim
    </a>
  </p>
</div>

          </div>
        )}
      </CardContent>
    </Card>
  </div>
</main>
  )
}