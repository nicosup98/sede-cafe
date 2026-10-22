import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import isoWeek from 'dayjs/plugin/isoWeek.js'
import relativeTime from 'dayjs/plugin/relativeTime.js'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import 'dayjs/locale/es.js'

dayjs.extend(utc)
dayjs.extend(isoWeek)
dayjs.extend(relativeTime)
dayjs.extend(customParseFormat)
dayjs.locale('es')

export default defineNuxtPlugin(() => {
  return {
    provide: {
      dayjs
    }
  }
})
