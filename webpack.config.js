const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/renderer.js',
  target: 'web',
  devtool: 'source-map',
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.js',
    publicPath: '/',
    globalObject: 'this', // Add this line
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        test: /\.css$/,
        use: ['style-loader', { loader: 'css-loader', options: { type: 'css' } }],
      },
    ],
  },
  resolve: {
    extensions: ['.*', '.js', '.jsx'],
    fallback: {
       "fs": false,
       "global": false,
       "events": require.resolve("events/"), 
       "path": require.resolve("path-browserify")
      },
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 8080,
    hot: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src', 'index.html'),
      publicPath: '/',
    }),
    new CopyPlugin({  // Add this block
      patterns: [
        { from: 'src/index.css', to: '' },
      ],
    }),  
  ],
};
