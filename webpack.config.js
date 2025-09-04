const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack')
const dotenv = require('dotenv')

module.exports = (env, argv) => {
  const isProduction = argv && argv.mode === 'production'
  // Cargar variables de entorno desde .env.local
  const envPath = path.resolve(__dirname, '.env.local')
  console.log('📄 Cargando variables de entorno desde:', envPath)
  
  const parsedEnv = dotenv.config({ path: envPath }).parsed || {}
  console.log('🔑 Variables cargadas:', Object.keys(parsedEnv).length)
  
  // Convertir variables de entorno a formato compatible con Webpack
  const envKeys = Object.keys(parsedEnv).reduce((prev, next) => {
    prev[`process.env.${next}`] = JSON.stringify(parsedEnv[next])
    return prev
  }, {})

  return {
  
    // Punto de entrada principal
    entry: {
      main: './src/js/main.js',
      styles: './src/scss/main.scss'
    },
    
    // Configuración de salida
    output: {
      path: isProduction ? path.resolve(__dirname, 'public'):path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
      chunkFilename: isProduction ? 'js/[name].[contenthash].chunk.js' : 'js/[name].chunk.js',
      clean: true,
      publicPath: '/'
    },
    
    // Configuración de módulos
    module: {
      rules: [
        // JavaScript/ESM
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        
        // SCSS/Sass
        {
          test: /\.scss$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: !isProduction,
                importLoaders: 2
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: !isProduction,
                postcssOptions: {
                  plugins: ['autoprefixer']
                }
              }
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: !isProduction
              , implementation: require('sass')
              }
            }
          ]
        },
        
        // Assets (imágenes, íconos, etc.)
        {
          test: /\.(png|jpe?g|gif|svg|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name].[hash][ext]'
          }
        },
        
        // Fuentes
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name].[hash][ext]'
          }
        },
        
        // PDFs
        {
          test: /\.pdf$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/documents/[name].[hash][ext]'
          }
        }
      ]
    },
    
    // Configuración de resolución de módulos
    resolve: {
      fallback: {
        "process": require.resolve("process/browser")
      },
      extensions: ['.js', '.scss', '.css'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@js': path.resolve(__dirname, 'src/js'),
        '@scss': path.resolve(__dirname, 'src/scss'),
        '@assets': path.resolve(__dirname, 'src/assets')
      }
    },
    
    // Plugins
    plugins: [
        // Define variables de entorno
        // Definir solo las claves individuales y NODE_ENV explícitamente
        new webpack.DefinePlugin({
          ...envKeys,
          'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
        }),
        // Polyfill para process/browser
        new webpack.ProvidePlugin({
          process: 'process/browser',
        }),
      // Plugin HTML principal
      new HtmlWebpackPlugin({
        template: './src/html/index.html',
        filename: 'index.html',
        inject: true,
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        } : false
      }),
      
      // Extracción de CSS
      new MiniCssExtractPlugin({
        filename: isProduction ? 'css/[name].[contenthash].css' : 'css/[name].css',
        chunkFilename: isProduction ? 'css/[name].[contenthash].chunk.css' : 'css/[name].chunk.css'
      }),

      // Copia de assets estáticos
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'src/assets',
            to: 'assets',
            noErrorOnMissing: true
          }
        ]
      }),
      
    
    ],
    
    // Optimizaciones
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false
            }
          },
          extractComments: false
        }),
        new CssMinimizerPlugin()
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true
          }
        }
      }
    },
    
    // Dev server
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist')
      },
      compress: true,
      port: 3009,
      hot: true,
      historyApiFallback: true,
      open: true,
      client: {
        overlay: {
          errors: true,
          warnings: false
        }
      }
    },
    
    // Source maps
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    // Configuración de performance
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    }
  };
};

