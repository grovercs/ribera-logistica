/*
Navicat MySQL Data Transfer

Source Server         : vielhacomputer.com
Source Server Version : 50648
Source Host           : vielhacomputer.com:3306
Source Database       : ribera

Target Server Type    : MYSQL
Target Server Version : 50648
File Encoding         : 65001

Date: 2026-06-29 15:02:07
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for actualizaciones
-- ----------------------------
DROP TABLE IF EXISTS `actualizaciones`;
CREATE TABLE `actualizaciones` (
  `IdActualizacion` int(11) NOT NULL AUTO_INCREMENT,
  `FechaActualizacion` datetime DEFAULT NULL,
  `MotivoActualizacion` text,
  `Version` varchar(255) DEFAULT NULL,
  `Completada` tinyint(4) DEFAULT NULL,
  PRIMARY KEY (`IdActualizacion`)
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for actualizacionesdetalles
-- ----------------------------
DROP TABLE IF EXISTS `actualizacionesdetalles`;
CREATE TABLE `actualizacionesdetalles` (
  `IdActualizacionDetalle` int(11) NOT NULL AUTO_INCREMENT,
  `IdActualizacion` int(11) DEFAULT NULL,
  `MotivoActualizacion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`IdActualizacionDetalle`)
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for cambios
-- ----------------------------
DROP TABLE IF EXISTS `cambios`;
CREATE TABLE `cambios` (
  `IdCambio` int(11) NOT NULL AUTO_INCREMENT,
  `CambioServicios` datetime DEFAULT NULL,
  `CambiosClientes` datetime DEFAULT NULL,
  `CambiosMateriales` datetime DEFAULT NULL,
  PRIMARY KEY (`IdCambio`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for chofers
-- ----------------------------
DROP TABLE IF EXISTS `chofers`;
CREATE TABLE `chofers` (
  `IdChofer` int(11) NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(255) DEFAULT NULL,
  `Telefono` varchar(255) DEFAULT NULL,
  `DNI` varchar(255) DEFAULT NULL,
  `Notas` varchar(255) DEFAULT NULL,
  `Vehiculo` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`IdChofer`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for clientes
-- ----------------------------
DROP TABLE IF EXISTS `clientes`;
CREATE TABLE `clientes` (
  `IdCliente` int(11) NOT NULL AUTO_INCREMENT,
  `CodigoCliente` int(255) NOT NULL,
  `CIF` varchar(12) DEFAULT NULL,
  `Nombre` varchar(255) DEFAULT NULL,
  `RazonSocial` varchar(255) DEFAULT NULL,
  `Direccion` varchar(255) DEFAULT NULL,
  `DirNumero` varchar(5) DEFAULT NULL,
  `DirPiso` varchar(20) DEFAULT NULL,
  `DirLetra` varchar(20) DEFAULT NULL,
  `Poblacion` varchar(255) DEFAULT NULL,
  `CodPostal` varchar(7) DEFAULT NULL,
  `Provincia` varchar(255) DEFAULT NULL,
  `Pais` varchar(255) DEFAULT NULL,
  `Fijo` varchar(20) DEFAULT NULL,
  `Movil` varchar(20) DEFAULT NULL,
  `Fax` varchar(20) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `Web` varchar(255) DEFAULT NULL,
  `Notas` text,
  `FechaAlta` date DEFAULT NULL,
  `NombreContacto` varchar(255) DEFAULT NULL,
  `TelContacto` varchar(20) DEFAULT NULL,
  `EmailContacto` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`IdCliente`,`CodigoCliente`),
  KEY `RazonSocial` (`RazonSocial`) USING BTREE
) ENGINE=MyISAM AUTO_INCREMENT=100019 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for correos
-- ----------------------------
DROP TABLE IF EXISTS `correos`;
CREATE TABLE `correos` (
  `IdCorreo` int(11) NOT NULL AUTO_INCREMENT,
  `Asunto` varchar(255) DEFAULT NULL,
  `Para` varchar(255) DEFAULT NULL,
  `Message` text,
  `FechaEnvio` datetime DEFAULT NULL,
  `IdServicio` int(11) DEFAULT NULL,
  `CodServicio` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`IdCorreo`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for datosempresa
-- ----------------------------
DROP TABLE IF EXISTS `datosempresa`;
CREATE TABLE `datosempresa` (
  `IdDatosEmpresa` int(11) NOT NULL AUTO_INCREMENT,
  `RazonSocial` varchar(255) DEFAULT NULL,
  `Direccion` varchar(255) DEFAULT NULL,
  `CodPostal` varchar(255) DEFAULT NULL,
  `Poblacion` varchar(255) DEFAULT NULL,
  `Provincia` varchar(255) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `Web` varchar(255) DEFAULT NULL,
  `Tel` varchar(255) DEFAULT NULL,
  `Fax` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`IdDatosEmpresa`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for empleados
-- ----------------------------
DROP TABLE IF EXISTS `empleados`;
CREATE TABLE `empleados` (
  `IdEmpleado` int(11) NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(255) DEFAULT NULL,
  `Telefono` varchar(255) DEFAULT NULL,
  `Notas` text,
  PRIMARY KEY (`IdEmpleado`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for empresasexternas
-- ----------------------------
DROP TABLE IF EXISTS `empresasexternas`;
CREATE TABLE `empresasexternas` (
  `IdEmpresaExterna` int(11) NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(255) DEFAULT NULL,
  `PersonaContacto` varchar(255) DEFAULT NULL,
  `Telefono` varchar(255) DEFAULT NULL,
  `Movil` varchar(255) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `Web` varchar(255) DEFAULT NULL,
  `Notas` text,
  PRIMARY KEY (`IdEmpresaExterna`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for estados
-- ----------------------------
DROP TABLE IF EXISTS `estados`;
CREATE TABLE `estados` (
  `IdEstado` int(11) NOT NULL AUTO_INCREMENT,
  `Estado` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`IdEstado`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for eventos
-- ----------------------------
DROP TABLE IF EXISTS `eventos`;
CREATE TABLE `eventos` (
  `IdEvento` int(11) NOT NULL AUTO_INCREMENT,
  `Evento` varchar(255) DEFAULT NULL,
  `Usuario` varchar(50) DEFAULT NULL,
  `NivelAcceso` varchar(20) DEFAULT NULL,
  `Fecha` datetime DEFAULT NULL,
  `Tabla` varchar(50) DEFAULT NULL,
  `Codigo` varchar(20) DEFAULT NULL,
  `PC` varchar(50) DEFAULT NULL,
  `Sucursal` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`IdEvento`)
) ENGINE=MyISAM AUTO_INCREMENT=95626 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for materiales
-- ----------------------------
DROP TABLE IF EXISTS `materiales`;
CREATE TABLE `materiales` (
  `IdMaterial` int(11) NOT NULL AUTO_INCREMENT,
  `Codigo` varchar(20) DEFAULT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Precio` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`IdMaterial`)
) ENGINE=MyISAM AUTO_INCREMENT=84 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for nivelesacceso
-- ----------------------------
DROP TABLE IF EXISTS `nivelesacceso`;
CREATE TABLE `nivelesacceso` (
  `IdNivelAcceso` int(11) NOT NULL AUTO_INCREMENT,
  `User` varchar(255) DEFAULT NULL,
  `Pass` varchar(255) DEFAULT NULL,
  `Nombre` varchar(255) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `NivelAcceso` enum('Administrador','Coordinador','Operario','Consultivo','Instalador') DEFAULT 'Consultivo',
  `Telefono` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`IdNivelAcceso`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for opciones
-- ----------------------------
DROP TABLE IF EXISTS `opciones`;
CREATE TABLE `opciones` (
  `IdOpciones` int(11) NOT NULL AUTO_INCREMENT,
  `NumCliente` int(11) DEFAULT NULL,
  `NumServicio` int(11) DEFAULT NULL,
  `NumAlbaran` int(11) DEFAULT NULL,
  `NumTransporte` int(11) DEFAULT NULL,
  `NombreEmpresa` varchar(255) DEFAULT NULL,
  `Direccion` varchar(255) DEFAULT NULL,
  `CodPostal` varchar(255) DEFAULT NULL,
  `Poblacion` varchar(255) DEFAULT NULL,
  `Provincia` varchar(255) DEFAULT NULL,
  `Pais` varchar(255) DEFAULT NULL,
  `DBHost` varchar(255) DEFAULT NULL,
  `DBUser` varchar(255) DEFAULT NULL,
  `DBPass` varchar(255) DEFAULT NULL,
  `DBDataBase` varchar(255) DEFAULT NULL,
  `ActualizacionesAuto` tinyint(1) DEFAULT NULL,
  `ArchivoActualizacion` varchar(255) DEFAULT NULL,
  `Url` varchar(255) DEFAULT NULL,
  `FTP_Host` varchar(255) DEFAULT NULL,
  `FTP_User` varchar(255) DEFAULT NULL,
  `FTP_Pass` varchar(255) DEFAULT NULL,
  `SMTP_EMail` varchar(255) DEFAULT NULL,
  `SMTP_User` varchar(255) DEFAULT NULL,
  `SMTP_Pass` varchar(255) DEFAULT NULL,
  `SMTP_Host` varchar(255) DEFAULT NULL,
  `SMTP_Port` int(11) DEFAULT NULL,
  `SMTP_Config` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`IdOpciones`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for servexternos
-- ----------------------------
DROP TABLE IF EXISTS `servexternos`;
CREATE TABLE `servexternos` (
  `IdServExternos` int(11) NOT NULL AUTO_INCREMENT,
  `Codigo` varchar(20) DEFAULT NULL,
  `Trabajo` varchar(255) DEFAULT NULL,
  `TiempoAprox` decimal(10,2) DEFAULT '0.00',
  `PrecioAprox` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`IdServExternos`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for servicios
-- ----------------------------
DROP TABLE IF EXISTS `servicios`;
CREATE TABLE `servicios` (
  `IdServicio` int(11) NOT NULL AUTO_INCREMENT,
  `CodigoServicio` varchar(255) DEFAULT NULL,
  `CodigoBarras` varchar(20) DEFAULT NULL,
  `IdCliente` int(11) DEFAULT NULL,
  `Nombrecliente` varchar(255) DEFAULT NULL,
  `IdTienda` int(11) DEFAULT NULL,
  `IdTipoServicio` int(11) DEFAULT NULL,
  `IdEmpresaExterna` int(11) DEFAULT NULL,
  `FechaEntrega` date DEFAULT NULL,
  `FechaPrevista` date DEFAULT NULL,
  `FechaInicio` date DEFAULT NULL,
  `FechaFin` date DEFAULT NULL,
  `Ubicacion` varchar(255) DEFAULT NULL,
  `IdEstado` int(11) DEFAULT NULL,
  `IdTipoDocumento` int(11) DEFAULT NULL,
  `NumDocumento` varchar(25) DEFAULT NULL,
  `ServPropioHoras` decimal(10,2) DEFAULT NULL,
  `ServPropioImporte` decimal(10,2) DEFAULT NULL,
  `ServExtEmpresa` varchar(255) DEFAULT NULL,
  `ServExtContacto` varchar(255) DEFAULT NULL,
  `ServExtObservaciones` text,
  `ServExtTel` varchar(20) DEFAULT NULL,
  `ServExtImporte` decimal(10,2) DEFAULT NULL,
  `DestDireccion` varchar(255) DEFAULT NULL,
  `DestNum` varchar(20) DEFAULT NULL,
  `DestPiso` varchar(20) DEFAULT NULL,
  `DestLetra` varchar(20) DEFAULT NULL,
  `DestCodPostal` varchar(10) DEFAULT NULL,
  `DestPoblacion` varchar(255) DEFAULT NULL,
  `DestProvincia` varchar(255) DEFAULT NULL,
  `DestAscensor` tinyint(1) DEFAULT NULL,
  `DestAccesoFurgo` tinyint(1) DEFAULT NULL,
  `DestAccesoCamion` tinyint(1) DEFAULT NULL,
  `DestNombre` varchar(255) DEFAULT NULL,
  `DestTel` varchar(20) DEFAULT NULL,
  `DestObservaciones` text,
  `Mapa` varchar(255) DEFAULT NULL,
  `Foto` varchar(255) DEFAULT NULL,
  `Firma` varchar(255) DEFAULT NULL,
  `TotalTrabajos` decimal(10,2) DEFAULT NULL,
  `TotalMateriales` decimal(10,2) DEFAULT NULL,
  `TotalServExt` decimal(10,2) DEFAULT NULL,
  `TotalServPropio` decimal(10,2) DEFAULT NULL,
  `Total` decimal(10,2) DEFAULT NULL,
  `HoraEntregaIni` time DEFAULT NULL,
  `HoraEntregaFin` time DEFAULT NULL,
  `IdEmpleado` int(11) DEFAULT NULL,
  `Incidencias` tinyint(4) DEFAULT NULL,
  `NumServicio` int(11) DEFAULT NULL,
  `IdNivelAcceso` int(11) DEFAULT NULL,
  PRIMARY KEY (`IdServicio`)
) ENGINE=InnoDB AUTO_INCREMENT=7878 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for serviciosfotos
-- ----------------------------
DROP TABLE IF EXISTS `serviciosfotos`;
CREATE TABLE `serviciosfotos` (
  `IdServicioFoto` int(11) NOT NULL AUTO_INCREMENT,
  `IdServicio` int(11) DEFAULT NULL,
  `Foto` varchar(255) DEFAULT NULL,
  `Nombre` varchar(255) DEFAULT NULL,
  `Descripcion` text,
  PRIMARY KEY (`IdServicioFoto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for serviciosincidencias
-- ----------------------------
DROP TABLE IF EXISTS `serviciosincidencias`;
CREATE TABLE `serviciosincidencias` (
  `IdServicioIncidencia` int(11) NOT NULL AUTO_INCREMENT,
  `IdServicio` int(11) DEFAULT NULL,
  `Descripcion` text,
  `Solucionada` tinyint(1) DEFAULT NULL,
  `Solucion` text,
  PRIMARY KEY (`IdServicioIncidencia`)
) ENGINE=InnoDB AUTO_INCREMENT=352 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for serviciosmaterial
-- ----------------------------
DROP TABLE IF EXISTS `serviciosmaterial`;
CREATE TABLE `serviciosmaterial` (
  `IdServicioMaterial` int(11) NOT NULL AUTO_INCREMENT,
  `IdServicio` int(11) DEFAULT NULL,
  `IdMaterial` varchar(255) DEFAULT NULL,
  `Codigo` varchar(255) DEFAULT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Precio` decimal(10,2) DEFAULT '0.00',
  `Cantidad` decimal(10,2) DEFAULT '0.00',
  `Total` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`IdServicioMaterial`)
) ENGINE=InnoDB AUTO_INCREMENT=29572 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for serviciosservexternos
-- ----------------------------
DROP TABLE IF EXISTS `serviciosservexternos`;
CREATE TABLE `serviciosservexternos` (
  `IdServiciosServExternos` int(11) NOT NULL AUTO_INCREMENT,
  `IdServicio` int(11) DEFAULT NULL,
  `IdServExternos` int(11) DEFAULT NULL,
  `Codigo` varchar(255) DEFAULT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Precio` decimal(10,2) DEFAULT '0.00',
  `TipoUnidades` enum('Horas','Unidades') DEFAULT 'Horas',
  `Cantidad` decimal(10,2) DEFAULT '0.00',
  `Total` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`IdServiciosServExternos`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for serviciostrabajos
-- ----------------------------
DROP TABLE IF EXISTS `serviciostrabajos`;
CREATE TABLE `serviciostrabajos` (
  `IdServicioTrabajo` int(11) NOT NULL AUTO_INCREMENT,
  `IdServicio` int(11) DEFAULT NULL,
  `IdTrabajo` int(11) DEFAULT NULL,
  `Codigo` varchar(255) DEFAULT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Precio` decimal(10,2) DEFAULT '0.00',
  `TipoUnidades` enum('Horas','Unidades') DEFAULT 'Horas',
  `Cantidad` decimal(10,2) DEFAULT '0.00',
  `Total` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`IdServicioTrabajo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for tiendas
-- ----------------------------
DROP TABLE IF EXISTS `tiendas`;
CREATE TABLE `tiendas` (
  `IdTienda` int(11) NOT NULL AUTO_INCREMENT,
  `Tienda` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`IdTienda`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for tiposdocumentos
-- ----------------------------
DROP TABLE IF EXISTS `tiposdocumentos`;
CREATE TABLE `tiposdocumentos` (
  `IdTipoDocumento` int(11) NOT NULL AUTO_INCREMENT,
  `TipoDocumento` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`IdTipoDocumento`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for tiposservicios
-- ----------------------------
DROP TABLE IF EXISTS `tiposservicios`;
CREATE TABLE `tiposservicios` (
  `IdTipoServicio` int(11) NOT NULL AUTO_INCREMENT,
  `TipoServicio` varchar(255) DEFAULT NULL,
  `Color` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`IdTipoServicio`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for trabajosestandar
-- ----------------------------
DROP TABLE IF EXISTS `trabajosestandar`;
CREATE TABLE `trabajosestandar` (
  `IdTrabajoEstandar` int(11) NOT NULL AUTO_INCREMENT,
  `Codigo` varchar(20) DEFAULT NULL,
  `Trabajo` varchar(255) DEFAULT NULL,
  `TiempoAprox` decimal(10,2) DEFAULT '0.00',
  `PrecioAprox` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`IdTrabajoEstandar`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for usuarios
-- ----------------------------
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `IdUsuario` int(11) NOT NULL AUTO_INCREMENT,
  `Usuario` varchar(255) DEFAULT NULL,
  `Pass` varchar(255) DEFAULT NULL,
  `TipoAcceso` enum('Admin','Usuario','Lectura') DEFAULT NULL,
  `CodServicio` int(11) DEFAULT NULL,
  `RazonSocial` varchar(255) DEFAULT NULL,
  `Direccion` varchar(150) DEFAULT NULL,
  `Poblacion` varchar(100) DEFAULT NULL,
  `CodigoPostal` varchar(10) DEFAULT NULL,
  `Provincia` varchar(100) DEFAULT NULL,
  `Telefono` varchar(20) DEFAULT NULL,
  `Fax` varchar(20) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `Web` varchar(255) DEFAULT NULL,
  `ActualizacionesAuto` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`IdUsuario`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for vehiculos
-- ----------------------------
DROP TABLE IF EXISTS `vehiculos`;
CREATE TABLE `vehiculos` (
  `IdVehiculo` int(11) NOT NULL AUTO_INCREMENT,
  `Vehiculo` varchar(255) DEFAULT NULL,
  `Matricula` varchar(255) DEFAULT NULL,
  `Tipo` enum('Coche','Furgoneta','Camión') DEFAULT NULL,
  PRIMARY KEY (`IdVehiculo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
