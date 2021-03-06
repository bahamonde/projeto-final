import Product from "../models/Product";
import ImageProduct from '../models/ImageProduct';
import * as Yup from 'yup';
import qr from 'qr-image';
import fs from 'fs';
import QrcodeProduct from "../models/QrcodeProduct";

class ProductController {
  async store(req, res) {
    /** PARA TESTAR NO INSOMIA: SALVAR PRIMEIRO UMA IMAGEM E USAR ID DA IMAGEM EM IMAGE */

    const schemaValidation = Yup.object().shape({
      name: Yup.string().required(),
      description: Yup.string().required(),
      price: Yup.number().required().positive(),
      quantity: Yup.number().required().positive().integer(),
      image: Yup.string().required(),
    });

    const checkSchema = await schemaValidation.isValid(req.body);

    if (!checkSchema) {
      return res.status(400).json({ error: "validations fails" });
    }

    const { name, description, price, quantity, image } = req.body;

    try {
      const product = await Product.create({
        name,
        description,
        price,
        quantity,
        image,
      });

      const { _id } = product;

      /** ATENÇÃO: posteriormente substituir site google pelo site da aplicação com o id do produto em questão */
      const qr_png = qr.image("http://www.google.com/", { type: "png" });
      const qrcode = fs.createWriteStream(`tmp/qrcodes/${_id}.png`);

      qr_png.pipe(qrcode);

      QrcodeProduct.create({
        filename: name,
        product: _id,
      });

      return res.status(200).json(product);
    } catch (err) {
      return res.status(400).json(err);
    }
  }
  async update(req, res) {
    const schemaValidation = Yup.object().shape({
      name: Yup.string(),
      description: Yup.string(),
      price: Yup.number().positive(),
      quantity: Yup.number().positive().integer(),
    });

    const { id } = req.params;

    const checkSchema = await schemaValidation.isValid(req.body);

    if (!checkSchema) {
      return res.status(400).json({ error: "validations fails" });
    }
  
    try {
      await Product.findOneAndUpdate({ _id: id }, req.body, {
          useFindAndModify: false,
      });
    
      return res.status(200).json(req.body); 
    } catch (err) {
      return res.status(400).json(err);
    }
  }
  async delete(req, res) {
    try {
      const { id } = req.params;

      const { image } = await Product.findById({ _id: id });
      await ImageProduct.findByIdAndDelete(image);
      await Product.findByIdAndDelete(id);
      await QrcodeProduct.findOneAndDelete({ product: id });
      
      fs.unlink(`tmp/qrcodes/${id}.png`, function (err){
        if (err) throw err;
        console.log('Arquivo deletado!');
      });

      return res.status(200).json({ message: "product deleted" });
    } catch (err) {
      return res.status(400).json(err);
    }
  }
}

export default new ProductController();
