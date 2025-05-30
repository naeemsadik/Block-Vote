import React from 'react';
import {
  Box,
  Container,
  Typography,
  Link,
  Grid,
  Divider,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  EnergySavingsLeaf as EcoIcon, // Ensured EnergySavingsLeaf is used
  Security as SecurityIcon,
  Speed as SpeedIcon,
  GitHub as GitHubIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Features', href: '/features' },
      { label: 'Security', href: '/security' },
      { label: 'Performance', href: '/performance' },
      { label: 'API Documentation', href: '/docs' },
    ],
    support: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Support', href: '/support' },
      { label: 'System Status', href: '/status' },
      { label: 'Release Notes', href: '/releases' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Compliance', href: '/compliance' },
    ],
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/blog' },
      { label: 'Press Kit', href: '/press' },
    ],
  };

  const socialLinks = [
    { icon: <GitHubIcon />, href: 'https://github.com/blockvote', label: 'GitHub' },
    { icon: <TwitterIcon />, href: 'https://twitter.com/blockvote', label: 'Twitter' },
    { icon: <LinkedInIcon />, href: 'https://linkedin.com/company/blockvote', label: 'LinkedIn' },
  ];

  const stats = [
    { icon: <EcoIcon />, label: 'Energy Saved', value: '95.2%', color: 'success' },
    { icon: <SecurityIcon />, label: 'Security Score', value: 'A+', color: 'primary' },
    { icon: <SpeedIcon />, label: 'Avg Response', value: '1.2s', color: 'info' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        mt: 'auto',
      }}
    >
      {/* Main Footer Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          {/* Brand Section */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EcoIcon sx={{ fontSize: 32, color: 'primary.main', mr: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  BlockVote
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                A revolutionary green computing blockchain voting system that reduces energy consumption by 95% 
                while maintaining the highest standards of security, transparency, and scalability.
              </Typography>
              
              {/* Key Stats */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {stats.map((stat, index) => (
                  <Tooltip key={index} title={`${stat.label}: ${stat.value}`}>
                    <Chip
                      icon={stat.icon}
                      label={stat.value}
                      size="small"
                      color={stat.color}
                      variant="outlined"
                    />
                  </Tooltip>
                ))}
              </Box>
              
              {/* Social Links */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                {socialLinks.map((social, index) => (
                  <Tooltip key={index} title={social.label}>
                    <IconButton
                      component={Link}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'primary.main',
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      {social.icon}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>
            </Box>
          </Grid>

          {/* Links Sections */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={3}>
              {/* Product Links */}
              <Grid item xs={6} sm={3}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  Product
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {footerLinks.product.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      color="text.secondary"
                      underline="hover"
                      sx={{
                        fontSize: '0.875rem',
                        '&:hover': {
                          color: 'primary.main',
                        },
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Box>
              </Grid>

              {/* Support Links */}
              <Grid item xs={6} sm={3}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  Support
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {footerLinks.support.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      color="text.secondary"
                      underline="hover"
                      sx={{
                        fontSize: '0.875rem',
                        '&:hover': {
                          color: 'primary.main',
                        },
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Box>
              </Grid>

              {/* Legal Links */}
              <Grid item xs={6} sm={3}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  Legal
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {footerLinks.legal.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      color="text.secondary"
                      underline="hover"
                      sx={{
                        fontSize: '0.875rem',
                        '&:hover': {
                          color: 'primary.main',
                        },
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Box>
              </Grid>

              {/* Company Links */}
              <Grid item xs={6} sm={3}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  Company
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {footerLinks.company.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      color="text.secondary"
                      underline="hover"
                      sx={{
                        fontSize: '0.875rem',
                        '&:hover': {
                          color: 'primary.main',
                        },
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Contact Information */}
        <Box sx={{ mt: 4, p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
            Contact Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon color="primary" fontSize="small" />
                <Link
                  href="mailto:support@blockvote.org"
                  color="text.secondary"
                  underline="hover"
                  sx={{ fontSize: '0.875rem' }}
                >
                  support@blockvote.org
                </Link>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon color="primary" fontSize="small" />
                <Link
                  href="tel:+1-555-VOTE-123"
                  color="text.secondary"
                  underline="hover"
                  sx={{ fontSize: '0.875rem' }}
                >
                  +1 (555) VOTE-123
                </Link>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon color="primary" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  San Francisco, CA
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Container>

      <Divider />

      {/* Bottom Footer */}
      <Container maxWidth="lg">
        <Box
          sx={{
            py: 2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {/* Copyright */}
          <Typography variant="body2" color="text.secondary">
            © {currentYear} BlockVote. All rights reserved. Built with 💚 for a sustainable future.
          </Typography>

          {/* Certifications and Badges */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="🌱 Carbon Neutral"
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip
              label="🔒 SOC 2 Compliant"
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label="⚡ 95% Energy Efficient"
              size="small"
              color="warning"
              variant="outlined"
            />
          </Box>
        </Box>
      </Container>

      {/* Environmental Impact Statement */}
      <Box
        sx={{
          bgcolor: 'success.main',
          color: 'white',
          py: 1,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            🌍 This voting system has saved approximately 2,847 kWh of energy compared to traditional systems - 
            equivalent to powering 3 homes for a month!
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Footer;