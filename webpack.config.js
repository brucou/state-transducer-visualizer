const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const webpack = require("webpack");
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

module.exports = {
  entry: "./src/index.js",
  devtool: 'inline-source-map',
  devServer: {
    contentBase: ".",
    hot: true
  },

  mode: "development",

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            // plugins: ["react-hot-loader/babel"]
          }
        }
      }
    ]
  },

  output: {
    path: path.resolve(__dirname, "./src"),
    filename: "bundle.js"
  },

  plugins: [
    // new HtmlWebpackPlugin({
    //   filename: "tests/index.html",
    //   template: "tests/index.html"
    // }),
    // new webpack.NamedModulesPlugin(),
    // new webpack.HotModuleReplacementPlugin()
  ]
};
