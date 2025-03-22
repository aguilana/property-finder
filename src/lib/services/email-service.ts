import nodemailer from 'nodemailer';
import { Property } from '@prisma/client';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport(process.env.EMAIL_SERVER || '');
  }

  async sendPropertyNotification(property: Property, email: string): Promise<void> {
    const subject = `New Property Alert: ${property.address}, ${property.city}`;
    
    const priceFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(property.price);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Property Found!</h2>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
          ${property.imageUrl ? `<img src="${property.imageUrl}" alt="Property Image" style="width: 100%; height: auto; display: block;">` : ''}
          <div style="padding: 16px;">
            <h3 style="margin-top: 0; color: #111827;">${property.address}</h3>
            <p style="margin: 4px 0; color: #4b5563;">${property.city}, ${property.state} ${property.zipCode}</p>
            <p style="font-size: 20px; font-weight: bold; margin: 8px 0; color: #2563eb;">${priceFormatted}</p>
            <p style="margin: 8px 0;"><strong>${property.bedrooms}</strong> beds • <strong>${property.bathrooms}</strong> baths${property.squareFeet ? ` • <strong>${property.squareFeet.toLocaleString()}</strong> sq ft` : ''}</p>
            ${property.description ? `<p style="color: #4b5563; margin-top: 12px;">${property.description.slice(0, 150)}${property.description.length > 150 ? '...' : ''}</p>` : ''}
            <a href="${property.url}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px; margin-top: 16px;">View Property</a>
          </div>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This email was sent to you because you set up property alerts with DMV Property Finder.</p>
      </div>
    `;
    
    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        ...options,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email notification');
    }
  }
}