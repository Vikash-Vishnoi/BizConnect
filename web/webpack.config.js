const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true,
    publicPath: '/',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
    runtimeChunk: 'single',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: './public/favicon.ico',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL || 'http://localhost:3000/api'),
      'process.env.REACT_APP_NAME': JSON.stringify(process.env.REACT_APP_NAME || 'WhatsApp Marketing Platform'),
      'process.env.REACT_APP_CONTACT_EMAIL': JSON.stringify(process.env.REACT_APP_CONTACT_EMAIL || 'support@whatsappmarketing.com'),
      'process.env.REACT_APP_CONTACT_PHONE': JSON.stringify(process.env.REACT_APP_CONTACT_PHONE || '+91 98765 43210'),
      'process.env.REACT_APP_CONTACT_ADDRESS': JSON.stringify(process.env.REACT_APP_CONTACT_ADDRESS || 'Your Business Address'),
      'process.env.REACT_APP_SOCIAL_TWITTER': JSON.stringify(process.env.REACT_APP_SOCIAL_TWITTER || 'https://twitter.com/yourcompany'),
      'process.env.REACT_APP_SOCIAL_LINKEDIN': JSON.stringify(process.env.REACT_APP_SOCIAL_LINKEDIN || 'https://linkedin.com/company/yourcompany'),
      'process.env.REACT_APP_SOCIAL_FACEBOOK': JSON.stringify(process.env.REACT_APP_SOCIAL_FACEBOOK || 'https://facebook.com/yourcompany'),
      'process.env.REACT_APP_SOCIAL_INSTAGRAM': JSON.stringify(process.env.REACT_APP_SOCIAL_INSTAGRAM || 'https://instagram.com/yourcompany'),
    }),
  ],
  performance: {
    hints: false, // Disable performance hints (e.g. asset size warnings)
  },
  infrastructureLogging: {
    level: 'warn', // Reduce webpack-dev-server logging noise
  },
  stats: 'errors-warnings', // Only show errors and warnings
  devServer: {
    port: 3001,
    hot: true,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        secure: false,
        changeOrigin: true,
      },
    },
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },
};
