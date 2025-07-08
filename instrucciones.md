# Envío de mensajes desde WhatsApp Web

## Requisitos

* Tener la ruta del archivo con la base de los números ó
* Copiar la base en la carpeta `macro_wa`

## Pasos

1. En la carpeta de `macro_wa`, buscar el archivo `mensaje.txt`. Abrir esete archivo en Bloque de Notas e ingresar el mensaje que se quiere enviar.
2. Hacer click-derecho en la carpeta `macro_wa` y seleccionar la opción “Abrir en terminal”.
3. En la terminal debe ingresar `node main.js`. Se abrirá una pestaña de Chrome con WhatsApp Web.
   1. Puede que sea necesario volver vincular el dispositivo. En ese caso, leer el QR.
4. Una vez vea en la pantalla los chats de WhatsApp vuelva a la ventana de la Terminal.
5. Ingrese la ruta de la base (incluyendo la extensión)

    ```sh
    Ingrese la ruta del archivo Excel: test.xlsx
    ```

6. En la temrinal se va a mostar el mensaje a enviar y le va a pedir presionar "ENTER" para continuar.
7. El programa empieza a mandar los mensajes y cierra la ventana de Chrome cuando haya finalizado.  
