import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import isoWeek from 'dayjs/plugin/isoWeek.js'
import 'dayjs/locale/es.js'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isoWeek)
dayjs.locale('es')

export const APP_TIMEZONE = 'America/Caracas'

/**
 * Returns current dayjs instance in America/Caracas timezone (UTC-4)
 */
export function getNowInCaracas() {
  return dayjs().tz(APP_TIMEZONE)
}

/**
 * Returns today's YYYY-MM-DD formatted date in America/Caracas timezone
 */
export function getTodayCaracasDate(): string {
  return dayjs().tz(APP_TIMEZONE).format('YYYY-MM-DD')
}

/**
 * Returns tomorrow's YYYY-MM-DD formatted date in America/Caracas timezone
 */
export function getTomorrowCaracasDate(): string {
  return dayjs().tz(APP_TIMEZONE).add(1, 'day').format('YYYY-MM-DD')
}

export { dayjs }
