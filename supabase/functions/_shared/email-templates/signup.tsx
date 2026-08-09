/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verify Email
        </Button>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#10102E',
  lineHeight: '1.3',
  margin: '0 0 20px',
}
const text = {
  fontSize: '16px',
  color: '#5B6472',
  lineHeight: '1.6',
  margin: '0 0 28px',
  wordBreak: 'break-word' as const,
}
const link = { color: 'inherit', textDecoration: 'underline', wordBreak: 'break-word' as const }
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
const footer = { fontSize: '13px', color: '#8A93A3', lineHeight: '1.6', margin: '32px 0 0' }

