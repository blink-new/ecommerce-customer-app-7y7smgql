import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: 'ecommerce-customer-app-7y7smgql',
  authRequired: true
})

export default blink