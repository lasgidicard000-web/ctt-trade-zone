/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface AdminMessageProps {
  subject?: string
  heading?: string
  body?: string
  buttonLabel?: string
  buttonUrl?: string
  recipientName?: string
}

const SITE_NAME = 'CTTTradezone'

const AdminMessageEmail = ({
  subject = 'A message from CTTTradezone',
  heading,
  body = '',
  buttonLabel,
  buttonUrl,
  recipientName,
}: AdminMessageProps) => {
  const paragraphs = String(body || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brandText}>{SITE_NAME}</Text>
          </Section>
          <Heading style={h1}>{heading || subject}</Heading>
          {recipientName ? <Text style={text}>Hi {recipientName},</Text> : null}
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => (
              <Text key={i} style={text}>
                {p}
              </Text>
            ))
          ) : (
            <Text style={text}>&nbsp;</Text>
          )}
          {buttonLabel && buttonUrl ? (
            <Button style={button} href={buttonUrl}>
              {buttonLabel}
            </Button>
          ) : null}
          <Text style={footer}>
            {SITE_NAME} Investment Center — this message was sent by our support team
            regarding your account.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminMessageEmail,
  subject: (data: Record<string, unknown>) =>
    (data?.subject as string) || 'A message from CTTTradezone',
  displayName: 'Admin message',
  previewData: {
    subject: 'Update on your CTTTradezone account',
    heading: 'Update on your account',
    body: 'Hi there,\n\nYour recent deposit has been confirmed and credited to your portfolio.\n\nThe CTTTradezone team',
    buttonLabel: 'Open your dashboard',
    buttonUrl: 'https://ctttradezone.com/wallet',
  },
} satisfies TemplateEntry

export default AdminMessageEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
}
const container = { padding: '24px', maxWidth: '600px' }
const brandBar = {
  backgroundColor: '#10102E',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 24px',
}
const brandText = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.5px',
  margin: '0',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#10102E',
  lineHeight: '1.3',
  margin: '0 0 20px',
  wordBreak: 'break-word' as const,
}
const text = {
  fontSize: '16px',
  color: '#5B6472',
  lineHeight: '1.6',
  margin: '0 0 20px',
  wordBreak: 'break-word' as const,
}
const button = {
  backgroundColor: '#1111D4',
  color: '#ffffff',
  fontSize: '16px',
  borderRadius: '12px',
  padding: '16px 28px',
  fontWeight: 'bold' as const,
  display: 'inline-block' as const,
  textDecoration: 'none',
  lineHeight: '1.2',
}
const footer = {
  fontSize: '13px',
  color: '#8A93A3',
  lineHeight: '1.6',
  margin: '32px 0 0',
}
