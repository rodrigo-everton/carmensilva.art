import {defineField, defineType} from 'sanity'

export const artworkType = defineType({
  name: 'artwork',
  title: 'Obra',
  type: 'document',

  fields: [
    defineField({
      name: 'title',
      title: 'Título',
      type: 'string',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'year',
      title: 'Ano',
      type: 'number',
    }),

    defineField({
      name: 'description',
      title: 'Descrição',
      type: 'text',
      rows: 5,
    }),

    defineField({
      name: 'technique',
      title: 'Técnica',
      type: 'string',
    }),

    defineField({
      name: 'dimensions',
      title: 'Dimensões',
      type: 'object',

      fields: [
        defineField({
          name: 'width',
          title: 'Largura',
          type: 'number',
        }),

        defineField({
          name: 'height',
          title: 'Altura',
          type: 'number',
        }),

        defineField({
          name: 'depth',
          title: 'Profundidade',
          type: 'number',
        }),

        defineField({
          name: 'unit',
          title: 'Unidade',
          type: 'string',
          initialValue: 'cm',
          options: {
            list: [
              {
                title: 'Centímetros',
                value: 'cm',
              },
            ],
          },
        }),
      ],
    }),

    defineField({
      name: 'mainImage',
      title: 'Imagem principal',
      type: 'image',

      options: {
        hotspot: true,
      },

      fields: [
        defineField({
          name: 'alt',
          title: 'Texto alternativo',
          type: 'string',
        }),
      ],

      validation: (rule) => rule.required().assetRequired(),
    }),

    defineField({
      name: 'images',
      title: 'Galeria',
      type: 'array',

      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },

          fields: [
            defineField({
              name: 'alt',
              title: 'Texto alternativo',
              type: 'string',
            }),
          ],
        },
      ],
    }),

    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',

      options: {
        list: [
          {
            title: 'Disponível',
            value: 'available',
          },
          {
            title: 'Reservada',
            value: 'reserved',
          },
          {
            title: 'Vendida',
            value: 'sold',
          },
          {
            title: 'Em exposição',
            value: 'exhibition',
          },
        ],
        layout: 'radio',
      },

      initialValue: 'available',

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'featured',
      title: 'Obra em destaque',
      type: 'boolean',
      initialValue: false,
    }),

    defineField({
      name: 'catalogNumber',
      title: 'Número de catálogo',
      type: 'string',
      description: 'Identificador interno da obra. Ex.: CS-2026-014',
    }),
  ],

  preview: {
    select: {
      title: 'title',
      media: 'mainImage',
      year: 'year',
      status: 'status',
    },

    prepare({title, media, year, status}) {
      const statusLabels: Record<string, string> = {
        available: 'Disponível',
        reserved: 'Reservada',
        sold: 'Vendida',
        exhibition: 'Em exposição',
      }

      return {
        title,
        media,
        subtitle: [
          year,
          status ? statusLabels[status] : undefined,
        ]
          .filter(Boolean)
          .join(' • '),
      }
    },
  },
})
