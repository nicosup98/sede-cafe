import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import isoWeek from 'dayjs/plugin/isoWeek.js'
import relativeTime from 'dayjs/plugin/relativeTime.js'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import 'dayjs/locale/es.js'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isoWeek)
dayjs.extend(relativeTime)
dayjs.extend(customParseFormat)
dayjs.locale('es')

// Set default timezone to America/Caracas (UTC-4)
dayjs.tz.setDefault('America/Caracas')

export default defineNuxtPlugin(() => {
  return {
    provide: {
      dayjs
    }
  }
})
