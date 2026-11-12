import React from 'react';
import { Wrench, Clock, RefreshCw } from 'lucide-react';

function Maintenance() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Animated Maintenance Icon */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
            <Wrench className="w-16 h-16 text-white animate-pulse" />
          </div>
          {/* Floating elements */}
          <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center shadow-lg animate-ping">
            <RefreshCw className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-card rounded-2xl shadow-2xl p-8 md:p-12 border border-border/60">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Under Maintenance</h1>

          <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
            We're currently performing some scheduled maintenance to improve your experience.
          </p>

          <div className="bg-blue-50 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">What we're doing:</h2>
            <ul className="text-blue-800 space-y-2 text-left max-w-md mx-auto">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Upgrading our systems for better performance
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Enhancing security features
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Improving user experience
              </li>
            </ul>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>75%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full animate-pulse"
                style={{ width: '75%' }}
              ></div>
            </div>
          </div>

          {/* Estimated Time */}
          <div className="bg-muted/40 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Estimated completion: 2 hours</span>
            </div>
          </div>

          {/* Contact Info */}
          <div className="border-t border-border/60 pt-8">
            <p className="text-muted-foreground mb-4">
              Need immediate assistance? Contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@marrylocal.in"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Email Support
              </a>
              <a
                href="tel:+91-1234567890"
                hidden
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                Call Support
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border/60">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} MarryLocal. We appreciate your patience.
            </p>
          </div>
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-10"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full opacity-10"></div>
        </div>
      </div>
    </div>
  );
}

export default Maintenance;
